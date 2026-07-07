import os
import logging
from pathlib import Path
from sqlalchemy.orm import Session
from pymilvus import connections, Collection
from pymilvus.client.connection_manager import ConnectionManager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
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

from . import models

# Load env variables
MILVUS_URI = os.getenv("MILVUS_URI", "")
if not MILVUS_URI:
    MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
    if MILVUS_HOST in ("localhost", "127.0.0.1"):
        MILVUS_URI = "./milvus_local.db"  # Use Milvus Lite (serverless file) locally
    else:
        MILVUS_URI = f"http://{MILVUS_HOST}:19530"

# Initialize embeddings and connection properties
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

# Background task to process and index PDF
def process_and_index_pdf(db: Session, doc_id: int, filepath: str, filename: str, user_id: int):
    """
    Background task to load PDF, chunk text, generate embeddings, and index in Milvus.
    
    Pipeline:
    1. Load document with PyPDFLoader
    2. Split into chunks with RecursiveCharacterTextSplitter
    3. Add metadata (user_id, doc_id, source_file)
    4. Generate embeddings and index in Milvus
    5. Update document status
    """
    try:
        logger.info(f"[INGESTION] Starting PDF processing - doc_id={doc_id}, file={filename}")
        
        # 1. Load document
        logger.info(f"[INGESTION] Loading PDF from {filepath}")
        loader = PyPDFLoader(filepath)
        documents = loader.load()
        logger.info(f"[INGESTION] Loaded {len(documents)} pages from PDF")
        
        if not documents:
            raise ValueError(f"PDF file is empty or could not be read: {filename}")
        
        # 2. Chunk documents
        logger.info(f"[INGESTION] Splitting into chunks (1000 chars, 200 overlap)")
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""],
        )
        chunks = splitter.split_documents(documents)
        logger.info(f"[INGESTION] Created {len(chunks)} chunks")
        
        if not chunks:
            raise ValueError(f"No text chunks could be extracted from {filename}")
        
        # 3. Add metadata to each chunk
        logger.info(f"[INGESTION] Adding metadata to chunks")
        for chunk in chunks:
            chunk.metadata["user_id"] = user_id
            chunk.metadata["doc_id"] = doc_id
            chunk.metadata["source_file"] = filename
            chunk.metadata["file_type"] = "pdf"

        # 4. Add to Milvus
        logger.info(f"[INGESTION] Generating embeddings and indexing in Milvus")
        if chunks:
            vector_store = get_vector_store()
            vector_store.add_documents(documents=chunks)
            logger.info(f"[INGESTION] Successfully indexed {len(chunks)} chunks in Milvus")

        # 5. Update status
        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        if doc:
            doc.status = "completed"
            db.commit()
            logger.info(f"[INGESTION] Document {doc_id} ({filename}) marked as COMPLETED")
            
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logger.error(f"[INGESTION] Error processing document {doc_id}: {str(e)}", exc_info=True)
        
        # Write detailed error log
        with open("ingestion_error.log", "a") as f:
            f.write(f"\n{'='*60}\nDocument {doc_id} ({filename}) failed at {__import__('datetime').datetime.now()}\n")
            f.write(error_msg)
        
        # Update document status to failed
        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
            db.commit()
            logger.error(f"[INGESTION] Document {doc_id} marked as FAILED")

# Delete document chunks from Milvus
def delete_document_chunks(doc_id: int, user_id: int):
    """Delete all chunks associated with a document from Milvus."""
    try:
        logger.info(f"[DELETION] Deleting chunks - doc_id={doc_id}, user_id={user_id}")
        vector_store = get_vector_store()
        col = Collection(name="my_documents", using=vector_store.alias)
        # Delete expression
        col.delete(expr=f"doc_id == {doc_id} and user_id == {user_id}")
        logger.info(f"[DELETION] Successfully deleted chunks for doc_id={doc_id}")
    except Exception as e:
        logger.error(f"[DELETION] Error deleting chunks from Milvus for document {doc_id}: {str(e)}", exc_info=True)

import json
import re
from langchain_community.tools import DuckDuckGoSearchResults

def search_web(query: str) -> str:
    """Perform web search as fallback when no document chunks are relevant."""
    try:
        logger.info(f"[WEB_SEARCH] Searching web for: {query[:100]}")
        search = DuckDuckGoSearchResults(num_results=5)
        results_str = search.run(query)
        logger.info(f"[WEB_SEARCH] Found web results")
        return results_str
    except Exception as e:
        logger.error(f"[WEB_SEARCH] Error during web search: {e}", exc_info=True)
        return "No web results found."

# ════════════════════════════════════════════════════════════════════════════════
# SYNCHRONOUS RAG QUERY FUNCTION (Primary interface for FastAPI endpoint)
# ════════════════════════════════════════════════════════════════════════════════

def query_rag(query: str, user_id: int, k: int = 10, similarity_threshold: float = 0.75):
    """
    Synchronous RAG query function that retrieves relevant chunks and generates answers.
    
    This is the PRIMARY interface called from the FastAPI /api/chat endpoint.
    
    Args:
        query: User's question
        user_id: User ID for document filtering
        k: Number of chunks to retrieve (default: 10)
        similarity_threshold: Minimum similarity score (0-1, default: 0.75)
        
    Returns:
        Tuple of (answer: str, sources: List[dict])
        
    Raises:
        Exception: If vector store fails or LLM returns error
    """
    try:
        logger.info(f"[RAG] Query started - user_id={user_id}, query_len={len(query)}, k={k}")
        
        vector_store = get_vector_store()
        logger.info(f"[RAG] Vector store connected")
        
        # Retrieve similarity chunks with scores, filtered by user_id
        logger.info(f"[RAG] Searching for {k} most similar chunks (threshold: {similarity_threshold})")
        results = vector_store.similarity_search_with_score(
            query=query, 
            k=k, 
            expr=f"user_id == {user_id}"
        )
        logger.info(f"[RAG] Retrieved {len(results)} results from vector store")
        
        valid_chunks = []
        sources = []
        
        for i, (doc, score) in enumerate(results):
            similarity = 1 - float(score)
            logger.debug(f"[RAG] Chunk {i+1}: similarity={similarity:.4f}, threshold={similarity_threshold}")
            if similarity >= similarity_threshold:
                valid_chunks.append(doc.page_content)
                sources.append({
                    "content": doc.page_content,
                    "source_file": doc.metadata.get("source_file", "unknown"),
                    "score": float(score)
                })
        
        logger.info(f"[RAG] Valid chunks after similarity filtering: {len(valid_chunks)}/{len(results)}")
        
        # If no valid chunks, fall back to web search
        if not valid_chunks:
            logger.warning(f"[RAG] No valid chunks found (similarity < {similarity_threshold}), using web search")
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
            
            logger.info(f"[RAG] Generating answer from web search results")
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
            logger.info(f"[RAG] Answer generated from web search")
            return response.content, web_sources
        
        # Generate answer using document chunks
        logger.info(f"[RAG] Generating answer from {len(valid_chunks)} document chunks")
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
        logger.info(f"[RAG] Answer generated successfully from {len(sources)} sources")
        return response.content, sources
        
    except Exception as e:
        logger.error(f"[RAG] Error during query execution: {str(e)}", exc_info=True)
        raise


# ════════════════════════════════════════════════════════════════════════════════
# ASYNC STREAMING RAG QUERY (Future enhancement for SSE)
# ════════════════════════════════════════════════════════════════════════════════

async def query_rag_stream(query: str, user_id: int, k: int = 10, similarity_threshold: float = 0.75):
    """Async streaming version for Server-Sent Events (future enhancement)."""
    # Currently not used, but preserved for future streaming implementation
    pass
