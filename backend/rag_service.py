import os
import logging
import re
import json
from pathlib import Path
from sqlalchemy.orm import Session
from pymilvus import connections, Collection
from pymilvus.client.connection_manager import ConnectionManager

logger = logging.getLogger(__name__)

# Monkeypatch pymilvus Connections._fetch_handler to resolve ConnectionNotExistException
# caused by langchain-milvus using ORM Collection inside MilvusClient wrapper.
original_fetch_handler = connections._fetch_handler

def patched_fetch_handler(alias=None):
    if alias is None:
        alias = "default"
    try:
        return original_fetch_handler(alias)
    except Exception as orig_err:
        if isinstance(alias, str) and alias.startswith("cm-"):
            manager = ConnectionManager.get_instance()
            for handler_id, managed in manager._dedicated.items():
                if f"cm-{handler_id}" == alias:
                    return managed.handler
            for managed in manager._registry.values():
                if f"cm-{id(managed.handler)}" == alias:
                    return managed.handler
        raise orig_err

connections._fetch_handler = patched_fetch_handler

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_milvus import Milvus
from langchain.chat_models import init_chat_model
from langchain_community.tools import DuckDuckGoSearchResults

from . import models

# Milvus connection URI
MILVUS_URI = os.getenv("MILVUS_URI", "")
if not MILVUS_URI:
    MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
    if MILVUS_HOST in ("localhost", "127.0.0.1"):
        MILVUS_URI = "./milvus_local.db"
    else:
        MILVUS_URI = f"http://{MILVUS_HOST}:19530"


def get_embeddings():
    return GoogleGenerativeAIEmbeddings(model="gemini-embedding-2")


def get_vector_store():
    embeddings = get_embeddings()
    vector_store = Milvus(
        embedding_function=embeddings,
        connection_args={"uri": MILVUS_URI},
        collection_name="my_documents",
        drop_old=False,
    )
    connections.connect(alias=vector_store.alias, uri=MILVUS_URI)
    return vector_store


def process_and_index_pdf(db: Session, doc_id: int, filepath: str, filename: str, user_id: int):
    """Background task to load PDF, chunk text, generate embeddings, and index in Milvus."""
    try:
        logger.info(f"[INGESTION] Starting - doc_id={doc_id}, file={filename}")

        loader = PyPDFLoader(filepath)
        documents = loader.load()
        if not documents:
            raise ValueError(f"PDF file is empty or could not be read: {filename}")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""],
        )
        chunks = splitter.split_documents(documents)
        if not chunks:
            raise ValueError(f"No text chunks could be extracted from {filename}")

        for chunk in chunks:
            chunk.metadata["user_id"] = user_id
            chunk.metadata["doc_id"] = doc_id
            chunk.metadata["source_file"] = filename
            chunk.metadata["file_type"] = "pdf"

        vector_store = get_vector_store()
        vector_store.add_documents(documents=chunks)
        logger.info(f"[INGESTION] Completed - doc_id={doc_id}, {len(chunks)} chunks indexed")

        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        if doc:
            doc.status = "completed"
            db.commit()

    except Exception as e:
        import traceback
        logger.error(f"[INGESTION] Failed - doc_id={doc_id}: {e}", exc_info=True)

        with open("ingestion_error.log", "a") as f:
            f.write(f"\n{'='*60}\nDocument {doc_id} ({filename}) failed at {__import__('datetime').datetime.now()}\n")
            f.write(traceback.format_exc())

        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
            db.commit()


def delete_document_chunks(doc_id: int, user_id: int):
    """Delete all chunks associated with a document from Milvus."""
    try:
        vector_store = get_vector_store()
        col = Collection(name="my_documents", using=vector_store.alias)
        col.delete(expr=f"doc_id == {doc_id} and user_id == {user_id}")
        logger.info(f"[DELETION] Removed chunks for doc_id={doc_id}")
    except Exception as e:
        logger.error(f"[DELETION] Failed for doc_id={doc_id}: {e}", exc_info=True)


def search_web(query: str) -> str:
    """Perform web search as fallback when no document chunks are relevant."""
    try:
        search = DuckDuckGoSearchResults(num_results=5)
        return search.run(query)
    except Exception as e:
        logger.error(f"[WEB_SEARCH] Failed: {e}")
        return "No web results found."


def query_rag(query: str, user_id: int, k: int = 10, similarity_threshold: float = 0.75):
    """
    Synchronous RAG query function that retrieves relevant chunks and generates answers.

    Args:
        query: User's question
        user_id: User ID for document filtering
        k: Number of chunks to retrieve (default: 10)
        similarity_threshold: Minimum similarity score (0-1, default: 0.75)

    Returns:
        Tuple of (answer: str, sources: List[dict])
    """
    try:
        vector_store = get_vector_store()

        results = vector_store.similarity_search_with_score(
            query=query,
            k=k,
            expr=f"user_id == {user_id}"
        )

        valid_chunks = []
        sources = []

        for doc, score in results:
            similarity = 1 - float(score)
            if similarity >= similarity_threshold:
                valid_chunks.append(doc.page_content)
                sources.append({
                    "content": doc.page_content,
                    "source_file": doc.metadata.get("source_file", "unknown"),
                    "score": float(score)
                })

        # If no valid chunks, fall back to web search
        if not valid_chunks:
            web_results_str = search_web(query)

            web_sources = []
            matches = re.findall(r"\[snippet:\s*(.*?),\s*title:\s*(.*?),\s*link:\s*(.*?)\]", web_results_str)
            if matches:
                for snippet, title, link in matches:
                    web_sources.append({
                        "content": snippet,
                        "url": link,
                        "source_file": title,
                        "score": 0.0
                    })
            else:
                web_sources.append({
                    "content": web_results_str,
                    "url": "https://duckduckgo.com",
                    "source_file": "Web Search Results",
                    "score": 0.0
                })

            model = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
            prompt = f"""You are a helpful AI assistant.
        
Answer the user's question ONLY using the provided web search context.

Web Search Context:
{web_results_str}

Question:
{query}

Answer:
"""
            response = model.invoke(prompt)
            return response.content, web_sources

        # Generate answer using document chunks
        all_chunks = "\n".join(valid_chunks)
        model = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
        prompt = f"""You are a helpful AI assistant.

Answer the user's question ONLY using the context below.

Context:
{all_chunks}

Question:
{query}

Answer:
"""
        response = model.invoke(prompt)
        return response.content, sources

    except Exception as e:
        logger.error(f"[RAG] Query failed: {e}", exc_info=True)
        raise
