import os
import dotenv
from pathlib import Path

from pymilvus import connections
from pymilvus.client.connection_manager import ConnectionManager

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
import tiktoken

# ── Load env ────────────────────────────────────────────────────────────────
dotenv.load_dotenv()
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")

# Milvus host comes from env so Docker networking works correctly.
# Inside Docker Compose it will be "milvus-standalone"; locally it's "localhost".
MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_URI  = f"http://{MILVUS_HOST}:19530"
PDF_DIR     = os.getenv("PDF_DIR", "./pdf")
QUERY       = os.getenv("RAG_QUERY", "What are the goals of AI?")


# ── 1. Load PDFs ─────────────────────────────────────────────────────────────
def process_all_pdfs(pdf_directory: str):
    """Load every PDF found under *pdf_directory* recursively."""
    all_documents = []
    pdf_dir = Path(pdf_directory)
    pdf_files = list(pdf_dir.glob("**/*.pdf"))
    print(f"Found {len(pdf_files)} PDF file(s) to process")

    for pdf_file in pdf_files:
        print(f"\nProcessing: {pdf_file.name}")
        try:
            loader = PyPDFLoader(str(pdf_file))
            documents = loader.load()
            for doc in documents:
                doc.metadata["source_file"] = pdf_file.name
                doc.metadata["file_type"]   = "pdf"
            all_documents.extend(documents)
            print(f"  ✓ Loaded {len(documents)} pages")
        except Exception as e:
            print(f"  ✗ Error: {e}")

    print(f"\nTotal documents loaded: {len(all_documents)}")
    return all_documents


# ── 2. Chunk documents ───────────────────────────────────────────────────────
def split_documents(documents, chunk_size=1000, chunk_overlap=200):
    """Split documents into smaller chunks for better RAG performance."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    print(f"Split {len(documents)} document(s) into {len(chunks)} chunks")

    if chunks:
        print(f"\nExample chunk:\n{chunks[0].page_content[:200]}...")
    return chunks


# ── 3. Token stats (optional, informational) ─────────────────────────────────
def show_token_stats(chunks):
    encoder = tiktoken.get_encoding("cl100k_base")
    for i, chunk in enumerate(chunks):
        ids = encoder.encode(chunk.page_content)
        print(f"Chunk {i+1} → {len(ids)} BPE tokens")


# ── 4. Build / populate vector store ────────────────────────────────────────
def build_vector_store(chunks, embeddings):
    print(f"\nConnecting to Milvus at {MILVUS_URI} …")
    vector_store = Milvus(
        embedding_function=embeddings,
        connection_args={"uri": MILVUS_URI},
        collection_name="my_documents",
        drop_old=True,
    )
    connections.connect(alias=vector_store.alias, uri=MILVUS_URI)
    vector_store.add_documents(documents=chunks)
    print("✓ Documents embedded and stored in Milvus")
    return vector_store


# ── 5. Retrieve relevant chunks ───────────────────────────────────────────────
def retrieve(vector_store, query: str, k: int = 10) -> str:
    results = vector_store.similarity_search_with_score(query=query, k=k)
    print(f"\nTop {k} chunks for: '{query}'\n" + "-" * 60)
    all_chunks = ""
    for i, (doc, score) in enumerate(results, start=1):
        print(f"Chunk {i}  score={score:.4f}")
        print(doc.page_content[:200])
        print("-" * 60)
        all_chunks += doc.page_content + "\n"
    return all_chunks


# ── 6. Generate answer ────────────────────────────────────────────────────────
def generate_answer(all_chunks: str, query: str) -> str:
    model = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
    prompt = f"""You are a helpful AI assistant.

Answer the user's question ONLY using the context below.
If the answer is not present in the context, say:
"I couldn't find the answer in the provided context."

Context:
{all_chunks}

Question:
{query}

Answer:
"""
    response = model.invoke(prompt)
    return response.content


# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Step 1 – load
    documents = process_all_pdfs(PDF_DIR)

    # Step 2 – chunk
    chunks = split_documents(documents)

    # Step 3 – token stats
    show_token_stats(chunks)

    # Step 4 – embeddings + vector store
    embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-2")
    vector_store = build_vector_store(chunks, embeddings)

    # Step 5 – retrieve
    context = retrieve(vector_store, QUERY)

    # Step 6 – answer
    print("\n" + "=" * 60)
    print("AI Response:\n")
    answer = generate_answer(context, QUERY)
    print(answer)
