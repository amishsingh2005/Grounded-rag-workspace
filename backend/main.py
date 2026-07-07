import os
import logging
from pathlib import Path
import dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
dotenv.load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from . import database
from . import models
from .routers import auth, documents, chat

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

# Include Routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)

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
