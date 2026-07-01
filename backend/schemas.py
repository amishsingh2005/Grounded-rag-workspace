from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

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
    source_type: str = "document"
    answer: str
    sources: List[SourceChunk]
