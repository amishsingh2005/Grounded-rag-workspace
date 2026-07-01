import os
import shutil
import logging
from pathlib import Path
from typing import List
import dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
dotenv.load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import database
import models
import schemas
import auth
import rag_service

# Initialize database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="RAG Pipeline API",
    description="Production-ready API for the RAG pipeline with authentication and document isolation",
    version="1.0.0",
)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup uploads directory
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
logger.info(f"Upload directory: {UPLOAD_DIR.resolve()}")

# Supported MIME types for PDFs (browsers may send different MIME types)
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/x-pdf",
    "application/x-bzpdf",
    "application/x-gzpdf",
    "application/x-www-form-urlencoded;charset=UTF-8",  # Some browsers
}

# ── Authentication Endpoints ──────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    hashed_password = auth.get_password_hash(user_in.password)
    user = models.User(email=user_in.email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/api/auth/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"user_id": user.id, "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ── Document Endpoints ────────────────────────────────────────────────────────

@app.post("/api/documents/upload", response_model=schemas.DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Upload and process a PDF document for the RAG pipeline.
    
    Validation:
    1. Check file extension (.pdf)
    2. Check MIME type (application/pdf or variants)
    3. Save file to uploads directory
    4. Queue background processing task
    
    Returns:
    Document record with status "processing"
    """
    try:
        logger.info(f"[UPLOAD] New upload request - user_id={current_user.id}, filename={file.filename}")
        
        # 1. Validate file extension
        if not file.filename.endswith(".pdf"):
            logger.warning(f"[UPLOAD] Rejected: Non-PDF extension - {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension. Only .pdf files are supported. Received: {file.filename}"
            )
        
        logger.info(f"[UPLOAD] Extension check passed: .pdf")
        
        # 2. Validate MIME type (log warning if suspicious, but don't block)
        if file.content_type not in ALLOWED_MIME_TYPES:
            logger.warning(f"[UPLOAD] Unusual MIME type: {file.content_type}. Expected: application/pdf. Will proceed with caution.")
        else:
            logger.info(f"[UPLOAD] MIME type validated: {file.content_type}")

        # 3. Save to unique file path locally
        import time
        file_uuid = f"{current_user.id}_{int(time.time())}_{file.filename}"
        # Replace spaces and clean filename (keep .pdf extension)
        safe_filename = "".join(c for c in file_uuid if c.isalnum() or c in "._-")
        filepath = UPLOAD_DIR / safe_filename
        
        logger.info(f"[UPLOAD] Saving to: {filepath}")
        
        # Save file content with streaming
        with filepath.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"[UPLOAD] File saved successfully")

        # 4. Validate file size
        file_size = filepath.stat().st_size
        logger.info(f"[UPLOAD] File size: {file_size} bytes")
        
        if file_size == 0:
            filepath.unlink()  # Delete empty file
            logger.error(f"[UPLOAD] Rejected: File is empty")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty. Please provide a valid PDF."
            )
        
        # 5. Create document record with status "processing"
        db_doc = models.Document(
            filename=file.filename,
            filepath=str(filepath),
            file_size=file_size,
            status="processing",
            user_id=current_user.id
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        logger.info(f"[UPLOAD] Document record created - doc_id={db_doc.id}, status=processing")

        # 6. Queue RAG loading & indexing in the background
        background_tasks.add_task(
            rag_service.process_and_index_pdf,
            db=db,
            doc_id=db_doc.id,
            filepath=str(filepath),
            filename=file.filename,
            user_id=current_user.id
        )
        logger.info(f"[UPLOAD] Background processing task queued")

        return db_doc
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"[UPLOAD] Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@app.get("/api/documents", response_model=List[schemas.DocumentResponse])
def list_documents(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    docs = db.query(models.Document).filter(models.Document.user_id == current_user.id).all()
    return docs

@app.delete("/api/documents/{doc_id}", status_code=status.HTTP_200_OK)
def delete_document(
    doc_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id, 
        models.Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    # Remove file from storage
    try:
        filepath = Path(doc.filepath)
        if filepath.exists():
            filepath.unlink()
    except Exception as e:
        print(f"Error removing file {doc.filepath}: {str(e)}")

    # Delete chunks from Milvus (in background to avoid API delay)
    background_tasks.add_task(rag_service.delete_document_chunks, doc_id=doc_id, user_id=current_user.id)

    # Remove record from db
    db.delete(doc)
    db.commit()

    return {"message": "Document deleted successfully"}


# ── Chat/RAG Endpoint ─────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=schemas.ChatResponse)
def chat_with_rag(
    chat_req: schemas.ChatRequest,
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Query the RAG system with a user question.
    
    This endpoint:
    1. Retrieves relevant document chunks from Milvus
    2. Filters by similarity threshold
    3. Generates an answer using Gemini LLM
    4. Returns answer + sources
    
    If no document chunks are relevant, falls back to web search.
    """
    try:
        logger.info(f"[CHAT] Query received - user_id={current_user.id}, question_len={len(chat_req.question)}")
        
        # Call the synchronous RAG query function
        answer, sources = rag_service.query_rag(
            query=chat_req.question,
            user_id=current_user.id,
            k=chat_req.top_k,
            similarity_threshold=chat_req.similarity_threshold
        )
        
        logger.info(f"[CHAT] Query completed - generated answer, {len(sources)} sources")
        
        # Format response
        source_chunks = [
            schemas.SourceChunk(
                content=chunk["content"],
                source_file=chunk["source_file"],
                score=chunk.get("score")
            )
            for chunk in sources
        ]
        
        return schemas.ChatResponse(answer=answer, sources=source_chunks)
        
    except Exception as e:
        logger.error(f"[CHAT] Error during RAG query: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying RAG pipeline: {str(e)}"
        )


# ── Frontend Static Files Mounting ───────────────────────────────────────────

# Resolve directory path
dist_path = Path("./frontend/dist").resolve()
if not dist_path.exists():
    dist_path = Path("../frontend/dist").resolve()

if dist_path.exists():
    # Mount assets folder
    assets_path = dist_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
    
    # Catch-all to serve index.html for client-side routing
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Ignore api paths
        if full_path.startswith("api/") or full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        index_file = dist_path / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        raise HTTPException(status_code=404, detail="Frontend built file not found")
else:
    @app.get("/")
    def read_root():
        return {
            "message": "FastAPI RAG Backend is running. Frontend has not been built yet. "
                       "Please run 'npm run build' inside the frontend directory."
        }
