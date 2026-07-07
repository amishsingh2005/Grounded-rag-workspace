import logging
import shutil
import time
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from .. import models, schemas, auth, database, rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/x-pdf",
    "application/x-bzpdf",
    "application/x-gzpdf",
    "application/x-www-form-urlencoded;charset=UTF-8",
}

@router.post("/upload", response_model=schemas.DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        logger.info(f"[UPLOAD] New upload request - user_id={current_user.id}, filename={file.filename}")
        
        if not file.filename.endswith(".pdf"):
            logger.warning(f"[UPLOAD] Rejected: Non-PDF extension - {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file extension. Only .pdf files are supported. Received: {file.filename}"
            )
        
        if file.content_type not in ALLOWED_MIME_TYPES:
            logger.warning(f"[UPLOAD] Unusual MIME type: {file.content_type}. Expected: application/pdf. Will proceed with caution.")

        file_uuid = f"{current_user.id}_{int(time.time())}_{file.filename}"
        safe_filename = "".join(c for c in file_uuid if c.isalnum() or c in "._-")
        filepath = UPLOAD_DIR / safe_filename
        
        with filepath.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = filepath.stat().st_size
        
        if file_size == 0:
            filepath.unlink()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty. Please provide a valid PDF."
            )
        
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

        background_tasks.add_task(
            rag_service.process_and_index_pdf,
            db=db,
            doc_id=db_doc.id,
            filepath=str(filepath),
            filename=file.filename,
            user_id=current_user.id
        )

        return db_doc
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[UPLOAD] Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@router.get("", response_model=List[schemas.DocumentResponse])
def list_documents(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    return db.query(models.Document).filter(models.Document.user_id == current_user.id).all()

@router.delete("/{doc_id}", status_code=status.HTTP_200_OK)
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

    try:
        filepath = Path(doc.filepath)
        if filepath.exists():
            filepath.unlink()
    except Exception as e:
        logger.error(f"Error removing file {doc.filepath}: {str(e)}")

    background_tasks.add_task(rag_service.delete_document_chunks, doc_id=doc_id, user_id=current_user.id)

    db.delete(doc)
    db.commit()

    return {"message": "Document deleted successfully"}
