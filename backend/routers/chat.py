import logging
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from .. import schemas, rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("", response_model=schemas.ChatResponse)
def chat_with_rag(
    chat_req: schemas.ChatRequest,
):
    try:
        logger.info("[CHAT] Query received")

        answer, sources = rag_service.query_rag(
            query=chat_req.question,
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


@router.post("/stream")
def chat_with_rag_stream(
    chat_req: schemas.ChatRequest,
):
    """Stream chat responses as Server-Sent Events."""
    logger.info("[CHAT_STREAM] Query received")

    return StreamingResponse(
        rag_service.query_rag_stream(
            query=chat_req.question,
            k=chat_req.top_k,
            similarity_threshold=chat_req.similarity_threshold
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
