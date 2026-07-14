# ── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy code and build
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build Backend & Serve ───────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY backend/ ./backend/

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /build/dist ./frontend/dist

# Expose port
EXPOSE 8000

# Environment variables
ENV MILVUS_HOST=milvus-standalone
ENV UPLOADS_DIR=/app/uploads

# Run FastAPI app with Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]