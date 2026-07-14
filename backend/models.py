from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from . import database

Base = database.Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    upload_time = Column(DateTime, server_default=func.now(), nullable=False)
    status = Column(String, default="processing", nullable=False)  # "processing", "completed", "failed"
