import logging
from fastapi import APIRouter, Depends, HTTPException, status
from .. import models, schemas, auth, rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("", response_model=schemas.ChatResponse)
def chat_with_rag(
    chat_req: schemas.ChatRequest,
    current_user: models.User = Depends(auth.get_current_user)
):
    try:
        logger.info(f"[CHAT] Query received - user_id={current_user.id}")
        
        answer, sources = rag_service.query_rag(
            query=chat_req.question,
            user_id=current_user.id,
            k=chat_req.top_k,
            similarity_threshold=chat_req.similarity_threshold
        )
        
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
