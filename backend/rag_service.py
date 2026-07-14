import os
import logging
import re
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
from google import genai
from google.genai import types

from . import models

# Milvus connection URI
MILVUS_URI = os.getenv("MILVUS_URI", "")
if not MILVUS_URI:
    MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
    if MILVUS_HOST in ("localhost", "127.0.0.1"):
        MILVUS_URI = "./milvus_local.db"
    else:
        MILVUS_URI = f"http://{MILVUS_HOST}:19530"

# ── Singletons ───────────────────────────────────────────────────────────────
_embeddings = None
_vector_store = None
_chat_model = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-2")
    return _embeddings


def get_vector_store():
    global _vector_store
    if _vector_store is None:
        embeddings = get_embeddings()
        _vector_store = Milvus(
            embedding_function=embeddings,
            connection_args={"uri": MILVUS_URI},
            collection_name="my_documents",
            drop_old=False,
        )
        connections.connect(alias=_vector_store.alias, uri=MILVUS_URI)
    return _vector_store


def get_chat_model():
    global _chat_model
    if _chat_model is None:
        _chat_model = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
    return _chat_model


def _build_prompt(context: str, query: str, context_label: str = "Context") -> str:
    """Build a grounded QA prompt from context and query."""
    return f"""You are a helpful AI assistant.

Answer the user's question ONLY using the provided {context_label.lower()}.

{context_label}:
{context}

Question:
{query}

Answer:
"""


def process_and_index_pdf(db: Session, doc_id: int, filepath: str, filename: str):
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
        logger.error(f"[INGESTION] Failed - doc_id={doc_id}: {e}", exc_info=True)

        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
            db.commit()


def delete_document_chunks(doc_id: int):
    """Delete all chunks associated with a document from Milvus."""
    try:
        vector_store = get_vector_store()
        col = Collection(name="my_documents", using=vector_store.alias)
        col.delete(expr=f"doc_id == {doc_id}")
        logger.info(f"[DELETION] Removed chunks for doc_id={doc_id}")
    except Exception as e:
        logger.error(f"[DELETION] Failed for doc_id={doc_id}: {e}", exc_info=True)


def search_web_gemini(query: str) -> tuple:
    """Use Gemini with Google Search grounding as fallback when no document chunks match."""
    try:
        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=query,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )

        answer = response.text or "No answer could be generated."

        # Extract grounding sources from the response
        web_sources = []
        grounding = getattr(response.candidates[0], "grounding_metadata", None)
        if grounding and getattr(grounding, "grounding_chunks", None):
            for chunk in grounding.grounding_chunks:
                web = getattr(chunk, "web", None)
                if web:
                    web_sources.append({
                        "content": getattr(web, "title", "Google Search"),
                        "url": getattr(web, "uri", "https://google.com"),
                        "source_file": getattr(web, "title", "Google Search"),
                        "score": 0.0
                    })

        if not web_sources:
            web_sources.append({
                "content": answer[:200],
                "url": "https://google.com",
                "source_file": "Google Search (via Gemini)",
                "score": 0.0
            })

        return answer, web_sources

    except Exception as e:
        logger.error(f"[WEB_SEARCH] Gemini Google Search failed: {e}", exc_info=True)
        return "Could not retrieve web search results.", [{
            "content": str(e),
            "url": "https://google.com",
            "source_file": "Google Search (Error)",
            "score": 0.0
        }]


def query_rag(query: str, k: int = 10, similarity_threshold: float = 0.75):
    """
    Synchronous RAG query function that retrieves relevant chunks and generates answers.

    Args:
        query: User's question
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

        # If no valid chunks, fall back to Gemini with Google Search grounding
        if not valid_chunks:
            return search_web_gemini(query)

        # Generate answer using document chunks
        all_chunks = "\n".join(valid_chunks)
        model = get_chat_model()
        prompt = _build_prompt(all_chunks, query)
        response = model.invoke(prompt)
        return response.content, sources

    except Exception as e:
        logger.error(f"[RAG] Query failed: {e}", exc_info=True)
        raise


def query_rag_stream(query: str, k: int = 10, similarity_threshold: float = 0.75):
    """
    Streaming RAG query generator that yields SSE-formatted events.

    Yields:
        SSE event strings: "event: sources", "event: chunk", "event: done", or "event: error"
    """
    import json

    try:
        vector_store = get_vector_store()

        results = vector_store.similarity_search_with_score(
            query=query,
            k=k,
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

        # If no valid chunks, fall back to Gemini with Google Search grounding
        if not valid_chunks:
            answer, web_sources = search_web_gemini(query)
            yield f"event: sources\ndata: {json.dumps(web_sources)}\n\n"
            # Stream the web answer in small chunks to simulate streaming
            chunk_size = 4
            words = answer.split(" ")
            for i in range(0, len(words), chunk_size):
                token = " ".join(words[i:i + chunk_size])
                if i > 0:
                    token = " " + token
                yield f"event: chunk\ndata: {json.dumps(token)}\n\n"
            yield "event: done\ndata: {}\n\n"
            return

        # Send sources first
        yield f"event: sources\ndata: {json.dumps(sources)}\n\n"

        # Stream answer using document chunks
        all_chunks = "\n".join(valid_chunks)
        model = get_chat_model()
        prompt = _build_prompt(all_chunks, query)

        for chunk in model.stream(prompt):
            token = chunk.content
            if token:
                yield f"event: chunk\ndata: {json.dumps(token)}\n\n"

        yield "event: done\ndata: {}\n\n"

    except Exception as e:
        logger.error(f"[RAG] Stream query failed: {e}", exc_info=True)
        yield f"event: error\ndata: {json.dumps(str(e))}\n\n"
