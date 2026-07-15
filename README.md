# DocuIntel AI 🧠

> **An enterprise-grade, AI-powered document intelligence platform** — upload PDFs, ask questions in natural language, and receive grounded answers backed by exact source citations. When your documents can't answer, the system intelligently falls back to live web search via Gemini's Google Search grounding.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Milvus](https://img.shields.io/badge/Milvus-3.0-00A1EA?style=flat-square)](https://milvus.io/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5--Flash-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Database Schema Overview](#database-schema-overview)
- [Key Features Deep Dive](#key-features-deep-dive)
- [Screenshots](#screenshots)
- [Workflow](#workflow)
- [Security Features](#security-features)
- [Performance Optimizations](#performance-optimizations)
- [Error Handling](#error-handling)
- [Logging & Monitoring](#logging--monitoring)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Contact](#contact)

---

## Overview

**DocuIntel AI** is a production-ready Retrieval-Augmented Generation (RAG) platform that transforms static PDF documents into an interactive, intelligent knowledge base. Built for enterprise workspaces, it combines semantic vector search with state-of-the-art generative AI to deliver precise, document-grounded answers in real time.

The system operates on a hybrid intelligence model:
1. **Primary**: Searches your uploaded documents using dense vector similarity.
2. **Fallback**: When documents are insufficient, it automatically queries the live web via Gemini's Google Search grounding — seamlessly and transparently.

Answers are streamed token-by-token with a typewriter effect and always include source citations so users can trace every claim back to its origin.

---

## Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **PDF Document Ingestion** | Upload PDFs with full validation (magic bytes, page count, readability). Documents are chunked and indexed asynchronously without blocking the UI. |
| 2 | **Semantic Vector Search** | Uses Google's `gemini-embedding-2` model to embed text chunks and stores them in Milvus for sub-second similarity retrieval. |
| 3 | **Streaming AI Responses** | Chat responses are streamed via Server-Sent Events (SSE) and revealed with a typewriter animation for a premium conversational experience. |
| 4 | **Intelligent Web Fallback** | If no sufficiently similar document chunks are found (or the model signals `INSUFFICIENT_CONTEXT`), the system transparently falls back to Gemini + Google Search grounding. |
| 5 | **Source Citations** | Every answer includes clickable source references — PDF filenames for document answers, web URLs for search-grounded answers. |
| 6 | **Configurable Retrieval Parameters** | Users can tune `top_k` (number of chunks) and `similarity_threshold` per query for fine-grained retrieval control. |
| 7 | **Document Lifecycle Management** | Full CRUD for documents: upload, list with status tracking, and deletion (removes both the file and associated Milvus vectors). |
| 8 | **Real-time Processing Status** | Dashboard polls for processing status updates every 2 seconds while documents are being indexed. |
| 9 | **Drag-and-Drop Upload** | Intuitive drag-and-drop file zone with client-side validation (type, size ≤ 50 MB). |
| 10 | **Docker Full-Stack Deployment** | Multi-stage Docker build with Compose orchestrating the RAG app, Milvus standalone, MinIO object storage, and etcd in a single command. |

---

## Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Frontend** | React 19, Vite 8 | SPA framework and dev/build tooling |
| **Frontend UI** | Lucide React, Custom CSS | Icon library and design system |
| **Frontend Linting** | Oxlint | Blazing-fast JavaScript/React linting |
| **Backend** | FastAPI 0.115, Python 3.12 | Async REST API framework |
| **Backend Server** | Uvicorn (standard) | ASGI server with WebSocket support |
| **RAG Framework** | LangChain 0.3 | Document loading, splitting, and LLM orchestration |
| **Embeddings** | `langchain-google-genai` → `gemini-embedding-2` | Dense vector generation for semantic search |
| **LLM** | Gemini 2.5 Flash (via LangChain + native SDK) | Answer generation and web-grounded fallback |
| **Vector Database** | Milvus 3.0 (standalone + Milvus Lite) | Scalable approximate nearest-neighbor search |
| **Vector DB Storage** | MinIO | S3-compatible object storage backend for Milvus |
| **Vector DB Config** | etcd | Distributed key-value store for Milvus metadata |
| **Relational Database** | SQLite (via SQLAlchemy 2.0) | Persistent document metadata storage |
| **PDF Processing** | PyPDFLoader (LangChain), pypdf | PDF loading, validation, and text extraction |
| **Text Splitting** | `RecursiveCharacterTextSplitter` | Intelligent chunking with overlap |
| **Authentication** | PyJWT, bcrypt | JWT-based auth infrastructure *(ready for integration)* |
| **Streaming** | Server-Sent Events (SSE) | Real-time token streaming to the frontend |
| **DevOps** | Docker, Docker Compose | Multi-service containerized deployment |
| **Environment** | python-dotenv | Environment variable management |
| **Validation** | Pydantic v2, email-validator | Request/response schema validation |
| **Search Fallback** | Google GenAI SDK + Google Search | Live web grounding when docs are insufficient |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React 19 + Vite)                │
│   Dashboard (Upload / Manage)  ↔  Workspace Chat (SSE Stream)   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / SSE
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Uvicorn)                      │
│                                                                  │
│  /api/documents  ──► Document Router ──► SQLite (SQLAlchemy)    │
│                                    └──► Background Task         │
│                                         └──► RAG Service        │
│  /api/chat       ──► Chat Router   ──► RAG Service              │
│  /api/chat/stream──► Chat Router   ──► RAG Service (SSE)        │
└──────────────┬──────────────────────────────────────────────────┘
               │
       ┌───────┴──────────────────────────────────┐
       │           RAG Service Pipeline            │
       │                                           │
       │  1. gemini-embedding-2  ──► Milvus Search │
       │  2. Similarity Filter  ──► Valid Chunks?  │
       │     YES: Gemini 2.5 Flash (LangChain)     │
       │     NO:  Gemini 2.5 Flash + Google Search │
       └───────────────────────────────────────────┘
               │
       ┌───────┴────────────────────────┐
       │        Milvus Standalone        │
       │  (etcd + MinIO + Milvus core)  │
       └────────────────────────────────┘
```

**Component interaction summary:**

1. The **React frontend** communicates with the FastAPI backend over a clean REST API and an SSE stream.
2. The **FastAPI backend** manages document metadata in **SQLite** and offloads indexing to **background tasks**.
3. The **RAG Service** uses **Google Gemini Embeddings** to encode queries, performs similarity search on **Milvus**, filters by a configurable threshold, then calls **Gemini 2.5 Flash** to generate grounded answers.
4. If document retrieval is insufficient, it falls back to **Gemini with Google Search grounding** and returns cited web sources.
5. In Docker, all services are networked internally: etcd → MinIO → Milvus → RAG App.

---

## Project Structure

```
📁 docuintel-ai/
├── 📄 Dockerfile                   # Multi-stage build (Node → Python)
├── 📄 docker-compose.yml           # Orchestrates app + Milvus stack
├── 📄 requirements.txt             # Python dependencies
├── 📄 start.bat                    # Local dev startup script (Windows)
├── 📄 .env                         # Environment secrets (gitignored)
├── 📄 .gitignore
├── 📄 .dockerignore
│
├── 📁 backend/                     # FastAPI application
│   ├── 📄 __init__.py
│   ├── 📄 main.py                  # App factory, CORS, static files, lifecycle
│   ├── 📄 database.py              # SQLAlchemy engine & session factory
│   ├── 📄 models.py                # ORM models (Document)
│   ├── 📄 schemas.py               # Pydantic request/response schemas
│   ├── 📄 rag_service.py           # Core RAG logic: ingest, search, stream
│   └── 📁 routers/
│       ├── 📄 documents.py         # /api/documents CRUD endpoints
│       └── 📄 chat.py              # /api/chat & /api/chat/stream endpoints
│
├── 📁 frontend/                    # React + Vite SPA
│   ├── 📄 index.html
│   ├── 📄 vite.config.js
│   ├── 📄 package.json
│   └── 📁 src/
│       ├── 📄 App.jsx              # Root component, state management
│       ├── 📄 index.css            # Global design system & utilities
│       ├── 📁 api/
│       │   └── 📄 client.js        # Typed API client (REST + SSE)
│       ├── 📁 components/
│       │   ├── 📄 Dashboard.jsx    # Document upload & management view
│       │   ├── 📄 WorkspaceChat.jsx# Chat interface with streaming
│       │   ├── 📄 Sidebar.jsx      # Navigation sidebar
│       │   └── 📁 ui/              # Reusable UI primitives
│       └── 📄 utils.js             # Helper functions (e.g., formatSize)
│
├── 📁 uploads/                     # Persisted PDF uploads (volume-mounted)
├── 📁 milvus_local.db/             # Milvus Lite local DB (dev only)
└── 📄 backend.db                   # SQLite database file
```

---

## Installation

### Prerequisites

Ensure the following are installed:

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.12+ | Recommended via `pyenv` or official installer |
| Node.js | 20+ | LTS version recommended |
| npm | 10+ | Bundled with Node.js |
| Docker | 24+ | With Docker Compose V2 |
| Git | Any | For cloning the repository |

### Clone the Repository

```bash
git clone https://github.com/your-username/docuintel-ai.git
cd docuintel-ai
```

### Local Development Setup (Without Docker)

**1. Create and activate a Python virtual environment:**

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

**2. Install Python dependencies:**

```bash
pip install -r requirements.txt
```

**3. Install frontend dependencies:**

```bash
cd frontend
npm install
cd ..
```

---

## Environment Variables

Create a `.env` file in the project root. **Never commit this file to version control.**

```env
# ── Required ─────────────────────────────────────────────────────────────────

# Google AI API Key — required for Gemini embeddings, chat, and web search grounding
# Obtain from: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_google_api_key_here

# ── Optional (with defaults) ──────────────────────────────────────────────────

# Milvus connection URI (defaults to local Milvus Lite file when running locally)
# Set to http://milvus-standalone:19530 when using Docker Compose
MILVUS_URI=

# Milvus host override (alternative to MILVUS_URI)
# Leave empty for local dev (uses ./milvus_local.db)
MILVUS_HOST=

# SQLite database path (Docker sets this to /app/data/backend.db)
DATABASE_URL=sqlite:///./backend.db

# JWT secret key for authentication — change in production!
JWT_SECRET=change-this-to-a-secure-random-value-in-production
```

> **Note:** In Docker Compose, `MILVUS_HOST`, `DATABASE_URL`, and `JWT_SECRET` are injected directly via `docker-compose.yml`. Only `GOOGLE_API_KEY` must be present in your `.env` file.

---

## Running the Project

### Option A: Docker Compose (Recommended — Full Stack)

Launches the entire stack: RAG app + Milvus standalone + MinIO + etcd.

```bash
# Build and start all services
docker compose up --build

# Run in detached (background) mode
docker compose up --build -d

# View live logs
docker compose logs -f rag-app

# Stop all services
docker compose down

# Stop and wipe all volumes (clears all data)
docker compose down -v
```

The application will be available at **http://localhost:8000**.

---

### Option B: Local Development (Hot-Reload)

Run backend and frontend separately for a fast development loop.

**Start the Backend:**

```bash
# From project root (with .venv activated)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

- FastAPI server: **http://localhost:8000**
- Swagger UI (interactive docs): **http://localhost:8000/docs**
- ReDoc: **http://localhost:8000/redoc**

**Start the Frontend (separate terminal):**

```bash
cd frontend
npm run dev
```

Vite dev server: **http://localhost:5173**

**Build Frontend for Production (served via FastAPI):**

```bash
cd frontend
npm run build
# Output → frontend/dist/ (served as static files by FastAPI)
```

---

### Option C: Windows Quick Start

```bat
start.bat
```

Handles virtual environment activation, backend startup, and frontend dev server launch in one step.

---

### Milvus (Local Development)

In local development, the application automatically uses **Milvus Lite** — a lightweight, embedded Milvus instance stored in `./milvus_local.db`. **No separate Milvus installation is required for local development.**

For production with Docker Compose, the full Milvus standalone stack (etcd + MinIO + Milvus) is orchestrated automatically.

---

## API Endpoints

### Documents

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| `POST` | `/api/documents/upload` | Upload and index a PDF | `multipart/form-data` (`file`) | `DocumentResponse` — 202 Accepted |
| `GET` | `/api/documents` | List all documents with status | — | `List[DocumentResponse]` |
| `DELETE` | `/api/documents/{doc_id}` | Delete document and its vectors | — | `{"message": "Document deleted successfully"}` |

### Chat / RAG

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| `POST` | `/api/chat` | Synchronous RAG query | `ChatRequest` JSON | `ChatResponse` JSON |
| `POST` | `/api/chat/stream` | Streaming RAG query | `ChatRequest` JSON | `text/event-stream` (SSE) |

### SSE Event Types (`/api/chat/stream`)

| Event Name | Data Format | Description |
|------------|-------------|-------------|
| `sources` | `[SourceChunk]` JSON array | Citation sources — emitted before or alongside streaming |
| `chunk` | Token string | Partial response text — append to build the full answer |
| `done` | `{}` | Signals the stream has completed successfully |
| `error` | Error message string | Signals a stream failure with error details |

### Example Payloads

**Request:**
```json
POST /api/chat
{
  "question": "What are the key findings in the uploaded report?",
  "top_k": 10,
  "similarity_threshold": 0.75
}
```

**Response:**
```json
{
  "answer": "According to the report, the key findings are...",
  "sources": [
    {
      "content": "The relevant passage from the document...",
      "source_file": "annual_report_2024.pdf",
      "url": null,
      "score": 0.12
    }
  ]
}
```

**Web Fallback Response:**
```json
{
  "answer": "Based on current information...",
  "sources": [
    {
      "content": "Google Search Result Title",
      "source_file": "Google Search Result Title",
      "url": "https://example.com/article",
      "score": 0.0
    }
  ]
}
```

---

## Database Schema Overview

### SQLite — `documents` Table

Managed by **SQLAlchemy 2.0** with automatic schema creation on startup (`create_all`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | PK, Auto-increment | Unique document identifier |
| `filename` | `VARCHAR` | NOT NULL | Original uploaded filename |
| `filepath` | `VARCHAR` | NOT NULL | Absolute path to saved PDF on disk |
| `file_size` | `INTEGER` | NOT NULL | File size in bytes |
| `upload_time` | `DATETIME` | NOT NULL, server default | Upload timestamp |
| `status` | `VARCHAR` | NOT NULL, default `"processing"` | `"processing"` / `"completed"` / `"failed"` |

### Milvus — `my_documents` Collection

Stores dense vector embeddings for all indexed PDF text chunks.

| Field | Type | Description |
|-------|------|-------------|
| `pk` | Auto ID | Primary key (auto-generated) |
| `text` | `VARCHAR` | The raw text chunk content |
| `vector` | `FLOAT_VECTOR` | Gemini embedding vector |
| `doc_id` | `INT64` (metadata) | Foreign reference to SQLite `documents.id` |
| `source_file` | `VARCHAR` (metadata) | Original PDF filename |
| `file_type` | `VARCHAR` (metadata) | Always `"pdf"` for uploaded documents |

---

## Key Features Deep Dive

### 1. Hybrid RAG Pipeline

The core intelligence of DocuIntel AI. When a user submits a question:

1. The query is embedded using `gemini-embedding-2` (the same model used during ingestion, ensuring embedding space consistency).
2. Milvus performs a top-`k` similarity search, returning the closest document chunks.
3. Chunks are filtered by a configurable `similarity_threshold` (default: 0.75).
4. If valid chunks exist, they are concatenated and injected into a structured prompt sent to **Gemini 2.5 Flash**.
5. The model is strictly instructed to answer only from the provided context, and to respond with `INSUFFICIENT_CONTEXT` if it cannot.
6. If `INSUFFICIENT_CONTEXT` is detected (in both sync and stream modes), the pipeline transparently falls back to **Gemini + Google Search grounding**, returning cited web sources.

### 2. Real-Time Streaming with Typewriter Effect

The streaming chat endpoint (`/api/chat/stream`) uses **Server-Sent Events (SSE)**. The frontend:
- Maintains an internal text buffer that accumulates raw tokens from the SSE stream.
- A `setInterval` typewriter reveals **3 characters every 20ms** (~150 chars/second) from the buffer.
- This decouples network speed from display speed, ensuring smooth animation regardless of Gemini's token delivery rate.
- Sources are emitted as a separate `sources` SSE event and are displayed as citations after the response completes.

### 3. Background PDF Ingestion

On upload, the PDF is immediately saved to disk and registered in SQLite with status `"processing"`. Indexing runs as a **FastAPI `BackgroundTask`**, which:
1. Loads the PDF with `PyPDFLoader`.
2. Splits it into **1,000-character chunks with 200-character overlap** using `RecursiveCharacterTextSplitter`.
3. Tags each chunk with `doc_id`, `source_file`, and `file_type` metadata.
4. Batch-adds all chunks to Milvus via `add_documents`.
5. Updates the document status to `"completed"` or `"failed"` in SQLite.

The frontend polls every **2 seconds** while any document is in `"processing"` state, then stops automatically.

### 4. Singleton Resource Management

The RAG service uses module-level singletons (`_embeddings`, `_vector_store`, `_chat_model`) initialized lazily on first use. This ensures:
- Expensive model and connection initialization happens only **once per process**.
- Subsequent requests reuse the same objects, dramatically reducing per-request latency.

### 5. Configurable Retrieval

Users can tune retrieval directly from the chat UI:
- **`top_k`**: How many candidate chunks Milvus retrieves (default: 3 in UI). Higher values cast a wider net but increase context length.
- **`similarity_threshold`**: The minimum cosine similarity required for a chunk to be considered relevant (default: 0.20 in UI). Lower values are more permissive; higher values are more selective.

---

## Screenshots

> _Add screenshots of your running application here._

| View | Screenshot |
|------|-----------|
| Dashboard (Upload & Manage) | ![Dashboard](screenshots/dashboard.png) |
| Workspace Chat (Streaming) | ![Chat](screenshots/chat.png) |

**To add screenshots:**
1. Take screenshots of your running app.
2. Save them to a `screenshots/` directory in the project root.
3. Update the paths in the table above.

---

## Workflow

End-to-end walkthrough of the application:

```
User Uploads PDF
      │
      ▼
[Frontend] Validates: type=PDF, size≤50MB, drag-and-drop supported
      │
      ▼
POST /api/documents/upload
      │
      ├─► [Backend] Validates PDF magic bytes (%PDF-) + page count
      ├─► Saves file to ./uploads/ with sanitized filename
      ├─► Creates DB record (status="processing")
      └─► Fires BackgroundTask
               │
               ▼
        Load PDF → Chunk (1k/200 overlap) → Embed → Index in Milvus
               │
               ▼
        Update DB: status="completed" or "failed"

[Frontend] Polls every 2s → live status badges (processing/completed/failed)

─────────────────────────────────────────────────────────────────

User Asks a Question
      │
      ▼
POST /api/chat/stream
      │
      ▼
[RAG Service]
  ├─► Embed query with gemini-embedding-2
  ├─► Similarity search in Milvus (top_k chunks)
  ├─► Filter by similarity_threshold
  │
  ├─ CHUNKS FOUND?
  │   YES ──► Build prompt → Stream Gemini 2.5 Flash
  │               │
  │         Model says INSUFFICIENT_CONTEXT?
  │               └─► Fall back to Google Search grounding
  │
  └─ NO CHUNKS ──► Google Search grounding directly
      │
      ▼
[SSE Stream]
  → event: sources  (citations)
  → event: chunk    (token, repeated)
  → event: done     (stream complete)
      │
      ▼
[Frontend] Typewriter reveals text + source citations displayed
```

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| **File Type Validation** | Server-side check of PDF magic bytes (`%PDF-`) and page count via `pypdf` — prevents malicious file uploads. |
| **File Size Enforcement** | Client validates ≤ 50 MB before upload; server validates actual byte length. |
| **Filename Sanitization** | Uploaded filenames are sanitized to alphanumeric + `._-` characters before saving to disk. |
| **CORS Configuration** | CORS middleware configured; `allow_origins` should be restricted to specific domains in production. |
| **JWT Infrastructure** | `pyjwt` and `bcrypt` installed and ready for JWT authentication and password hashing integration. |
| **Environment Secrets** | API keys and secrets loaded exclusively from environment variables via `python-dotenv` — never hardcoded. |
| **Input Validation** | All API request bodies validated by Pydantic v2 schemas before any processing occurs. |
| **SQL Injection Prevention** | All database queries use SQLAlchemy ORM — no raw SQL string interpolation. |
| **Docker Isolation** | Services run in isolated containers with internal networking; only port 8000 is exposed externally. |

---

## Performance Optimizations

| Optimization | Details |
|-------------|---------|
| **Singleton Models** | Embedding and chat models initialized once and reused, eliminating per-request cold starts. |
| **Background Ingestion** | PDF indexing is non-blocking — upload returns immediately with HTTP 202. |
| **Chunk Overlap** | 200-character overlap between 1,000-character chunks preserves cross-boundary context. |
| **Similarity Filtering** | Pre-filtering chunks by threshold before LLM invocation reduces token usage and improves quality. |
| **Streaming Responses** | SSE streaming delivers the first tokens immediately rather than waiting for the full response. |
| **Typewriter Buffering** | Client-side typewriter decouples network jitter from animation smoothness. |
| **Selective Polling** | Status polling is only active when documents are in `"processing"` state — stops automatically. |
| **Docker Layer Caching** | `requirements.txt` and `package.json` are copied before source code to maximize cache hits on rebuilds. |
| **Multi-Stage Docker Build** | Frontend is compiled in a Node.js stage; only `dist/` assets are copied to the final Python image. |
| **Milvus Lite (Dev)** | Eliminates full Milvus cluster overhead during local development. |

---

## Error Handling

The application implements a layered error handling strategy:

**Backend:**
- FastAPI `HTTPException` with semantic HTTP status codes (400, 404, 500) and descriptive detail messages for all API errors.
- Background tasks (`process_and_index_pdf`, `delete_document_chunks`) catch all exceptions and update the document `status` to `"failed"` without crashing the server process.
- The streaming generator catches exceptions and yields an `event: error` SSE event, ensuring the frontend always receives a signal even on failure.
- `exc_info=True` is used on all `logger.error` calls to capture full stack traces.

**Frontend:**
- Upload errors display inline below the upload zone with a clear message.
- Chat stream errors display a dismissible error panel containing the error code, message, timestamp, and original question for easy retry.
- Document fetch errors are silently logged to avoid disrupting the UI.
- SSE `onError` handlers cleanly remove the pending bot message placeholder before rendering the error state.

---

## Logging & Monitoring

DocuIntel AI uses Python's standard `logging` module with structured, prefixed log messages.

```
Format: %(asctime)s - %(name)s - %(levelname)s - %(message)s
Level:  INFO (default)
```

**Log prefixes by operation:**

| Prefix | Operation |
|--------|-----------|
| `[INGESTION]` | PDF loading, chunking, and Milvus indexing |
| `[DELETION]` | Vector chunk removal from Milvus |
| `[RAG]` | Synchronous and streaming query execution |
| `[CHAT]` | Chat router request handling |
| `[CHAT_STREAM]` | Streaming chat request handling |
| `[UPLOAD]` | Document upload validation and saving |
| `[WEB_SEARCH]` | Gemini Google Search grounding fallback |

**Example log output:**
```
2026-07-15 06:30:00 - backend.rag_service - INFO - [INGESTION] Starting - doc_id=42, file=report.pdf
2026-07-15 06:30:05 - backend.rag_service - INFO - [INGESTION] Completed - doc_id=42, 87 chunks indexed
2026-07-15 06:31:10 - backend.rag_service - INFO - [WEB_SEARCH] No valid chunks found, falling back to Google Search
```

> **Future:** Integrate with OpenTelemetry, Prometheus, or a managed logging service (Datadog, GCP Cloud Logging) for production observability.

---

## Testing

### Running Tests

> **Note:** Automated tests are planned — see [Roadmap](#roadmap).

**Interactive API Testing (Swagger UI):**

```bash
# Start backend
uvicorn backend.main:app --reload

# Open in browser
http://localhost:8000/docs
```

**Manual curl Testing:**

```bash
# Upload a document
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@/path/to/document.pdf"

# List all documents
curl http://localhost:8000/api/documents

# Chat (synchronous)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Summarize this document", "top_k": 5, "similarity_threshold": 0.75}'

# Delete a document
curl -X DELETE http://localhost:8000/api/documents/1
```

**Frontend Linting:**

```bash
cd frontend
npm run lint
```

---

## Deployment

### Docker Compose (Self-Hosted)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env → set GOOGLE_API_KEY

# 2. Build and deploy
docker compose up --build -d

# 3. Verify all services are healthy
docker compose ps

# 4. Check application logs
docker compose logs -f rag-app
```

**Exposed ports:**

| Service | Port | Access |
|---------|------|--------|
| RAG Application | `8000` | External |
| Milvus gRPC | `19530` | Internal only |
| MinIO Console | `9001` | Internal (expose for admin if needed) |
| etcd | `2379` | Internal only |

### Production Checklist

- [ ] Place **Nginx or Traefik** in front of port 8000 for TLS termination.
- [ ] Restrict `allow_origins` in `main.py` to your production domain.
- [ ] Set a cryptographically secure `JWT_SECRET` environment variable.
- [ ] Verify `uploads/` and `backend_data/` are volume-mounted for persistence.
- [ ] For high traffic: replace SQLite with **PostgreSQL** and scale Milvus with a dedicated cluster.
- [ ] Set up automated backups for the SQLite database and Milvus volumes.

---

## Roadmap

- [x] PDF document upload with multi-layer validation
- [x] Background PDF ingestion (chunking + embedding + indexing)
- [x] Milvus vector store integration with similarity search
- [x] Gemini 2.5 Flash answer generation
- [x] Intelligent Google Search grounding fallback
- [x] Streaming SSE chat with typewriter effect
- [x] Source citations for all answers (document and web)
- [x] Configurable `top_k` and `similarity_threshold`
- [x] Document management (list, delete with vector cleanup)
- [x] Docker Compose full-stack deployment
- [x] Multi-stage Dockerfile (Node → Python)
- [ ] User authentication (JWT login / registration)
- [ ] Multi-user workspace isolation
- [ ] Chat history persistence
- [ ] Document tagging and search/filter
- [ ] Automated unit and integration tests (pytest + vitest)
- [ ] Support for additional file types (DOCX, TXT, Markdown)
- [ ] Admin dashboard with usage analytics
- [ ] OpenTelemetry / Prometheus monitoring
- [ ] Kubernetes Helm chart for cloud-native deployment
- [ ] Rate limiting and API key management

---

## Future Enhancements

| Enhancement | Description |
|------------|-------------|
| **Multi-modal Support** | Extend ingestion to handle images and charts within PDFs using vision-capable models. |
| **Re-ranking** | Add a cross-encoder re-ranking step after initial Milvus retrieval to improve answer precision. |
| **Hybrid Search** | Combine dense vector search with BM25 keyword search for better recall on exact-match queries. |
| **Document Versioning** | Support uploading updated document versions while preserving indexing history. |
| **Collaborative Workspaces** | Multi-tenant architecture with shared document libraries and role-based access control. |
| **Answer Confidence Scoring** | Surface a confidence indicator alongside answers derived from chunk similarity scores. |
| **Streaming Ingestion Progress** | Stream real-time indexing progress to the frontend via WebSockets. |
| **External Knowledge Connectors** | Plugin architecture to connect Confluence, Notion, or Google Drive as retrieval sources. |

---

## Contributing

Contributions are welcome and appreciated! Please follow these guidelines:

### Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/your-username/docuintel-ai.git
   cd docuintel-ai
   ```
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

### Development Workflow

4. Make your changes following the existing code style.
5. **Lint your code** before committing:
   ```bash
   # Frontend
   cd frontend && npm run lint

   # Backend (add ruff/flake8 to requirements-dev.txt)
   ruff check backend/
   ```
6. **Write or update tests** for your changes.
7. **Commit** with a descriptive conventional message:
   ```bash
   git commit -m "feat: add DOCX file ingestion support"
   ```
8. **Push** to your fork and open a **Pull Request** against `main`.

### Pull Request Guidelines

- Provide a clear description of what your PR changes and why.
- Reference related issues (e.g., `Closes #42`).
- Keep PRs focused — one feature or fix per PR.
- Ensure all CI checks pass before requesting review.

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation only changes |
| `refactor:` | Code restructuring without behavior change |
| `test:` | Adding or updating tests |
| `chore:` | Build system or tooling changes |

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 DocuIntel AI Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Acknowledgements

This project is built on excellent open-source work and powerful APIs:

| Project / Service | Contribution |
|-------------------|-------------|
| [**LangChain**](https://github.com/langchain-ai/langchain) | Foundational RAG framework — document loading, text splitting, and LLM orchestration. |
| [**Milvus**](https://milvus.io/) | World-class open-source vector database enabling fast, scalable similarity search. |
| [**Google Gemini**](https://deepmind.google/technologies/gemini/) | State-of-the-art embedding model (`gemini-embedding-2`) and generative LLM (`gemini-2.5-flash`). |
| [**FastAPI**](https://fastapi.tiangolo.com/) | High-performance Python web framework with automatic OpenAPI documentation. |
| [**React**](https://react.dev/) | Declarative UI library powering the enterprise frontend. |
| [**Vite**](https://vitejs.dev/) | Lightning-fast frontend build tooling. |
| [**PyMilvus**](https://github.com/milvus-io/pymilvus) | Official Python SDK for Milvus. |
| [**SQLAlchemy**](https://www.sqlalchemy.org/) | Robust Python ORM for relational database management. |
| [**Lucide React**](https://lucide.dev/) | Beautiful, consistent open-source icon library. |
| [**pypdf**](https://github.com/py-pdf/pypdf) | Pure-Python PDF reading and validation library. |

---

## Contact

> **Maintainer:** Your Name
> **Email:** your.email@example.com
> **GitHub:** [@your-username](https://github.com/your-username)
> **Project Repository:** [github.com/your-username/docuintel-ai](https://github.com/your-username/docuintel-ai)

**Found a bug?** → Open an [Issue](https://github.com/your-username/docuintel-ai/issues)
**Have a question?** → Start a [Discussion](https://github.com/your-username/docuintel-ai/discussions)

---

<div align="center">

Made with ❤️ and powered by Gemini AI

[⬆ Back to Top](#docuintel-ai-)

</div>
