from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# Document Schemas
class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    upload_time: datetime
    status: str

    class Config:
        from_attributes = True

# Chat/RAG Schemas
class ChatRequest(BaseModel):
    question: str
    top_k: Optional[int] = 5
    similarity_threshold: Optional[float] = 0.75

class SourceChunk(BaseModel):
    content: str
    source_file: Optional[str] = None
    url: Optional[str] = None
    score: Optional[float] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
