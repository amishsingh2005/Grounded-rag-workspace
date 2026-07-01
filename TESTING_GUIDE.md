# 🧪 RAG PIPELINE - TESTING & VERIFICATION GUIDE

## Quick Start - Test All Fixes

### 1. Check Logging is Active

**On Linux/Mac:**
```bash
# Terminal 1: Start backend with logging visible
cd backend
python main.py
# Look for: [UPLOAD], [INGESTION], [RAG] tags

# Terminal 2: Check logs in real-time
tail -f ingestion_error.log
```

**On Windows (PowerShell):**
```powershell
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Monitor error log
Get-Content ingestion_error.log -Wait
```

---

## Test Scenarios

### ✅ TEST 1: Upload Valid PDF

**Steps:**
1. Open frontend at `http://localhost:5173`
2. Log in
3. Drag & drop a valid PDF (or click browse)
4. Monitor logs

**Check Console:**
```
[UPLOAD] New upload - user_id=1, filename=document.pdf
[UPLOAD] Extension check passed: .pdf
[UPLOAD] MIME type validated: application/pdf
[UPLOAD] Saving to: ./uploads/1_TIMESTAMP_document.pdf
[UPLOAD] File saved successfully
[UPLOAD] File size: 2847361 bytes
[UPLOAD] Document record created - doc_id=1, status=processing
[UPLOAD] Background processing task queued
```

**Check Background:**
```
[INGESTION] Starting PDF processing - doc_id=1, file=document.pdf
[INGESTION] Loading PDF from ./uploads/...
[INGESTION] Loaded 42 pages from PDF
[INGESTION] Splitting into chunks (1000 chars, 200 overlap)
[INGESTION] Created 187 chunks
[INGESTION] Adding metadata to chunks
[INGESTION] Generating embeddings and indexing in Milvus
[INGESTION] Successfully indexed 187 chunks in Milvus
[INGESTION] Document 1 (document.pdf) marked as COMPLETED
```

**Frontend Result:** Document appears with "Processed" badge ✅

---

### ❌ TEST 2: Upload Non-PDF File

**Steps:**
1. Try uploading `notes.txt` or `notes.docx`
2. Observe immediate error

**Expected Error in Frontend:**
```
"Invalid file extension. Only .pdf files supported. Received: notes.txt"
```

**Check Console:**
```
[UPLOAD] New upload - user_id=1, filename=notes.txt
[UPLOAD] Rejected: Non-PDF extension - notes.txt
```

**Expected Behavior:** ✅ User sees specific error about extension

---

### ❌ TEST 3: Upload Empty PDF File

**Steps:**
```bash
# Create empty 0-byte file
touch empty.pdf

# Upload via frontend
```

**Expected Error in Frontend:**
```
"Uploaded file is empty. Please provide a valid PDF."
```

**Check Console:**
```
[UPLOAD] New upload - user_id=1, filename=empty.pdf
[UPLOAD] Extension check passed: .pdf
[UPLOAD] MIME type validated: application/pdf
[UPLOAD] File saved successfully
[UPLOAD] File size: 0 bytes
[UPLOAD] Rejected: File is empty
```

**Expected Behavior:** ✅ User sees file size error

---

### ❌ TEST 4: Upload Corrupted PDF

**Steps:**
```bash
# Create fake PDF (text saved as .pdf)
echo "This is not a PDF file" > fake.pdf

# Upload via frontend
```

**Expected Frontend:** Document marked as "Failed" (status check polls)

**Check Console:**
```
[UPLOAD] New upload - user_id=1, filename=fake.pdf
[UPLOAD] Extension check passed: .pdf
[UPLOAD] MIME type validated: application/pdf
[UPLOAD] File saved successfully
[UPLOAD] File size: 22 bytes
[UPLOAD] Document record created - doc_id=3, status=processing
[UPLOAD] Background processing task queued

[INGESTION] Starting PDF processing - doc_id=3, file=fake.pdf
[INGESTION] Loading PDF from ./uploads/...
[INGESTION] Error processing document: Cannot find pdf header
[INGESTION] Document 3 marked as FAILED
```

**Check `ingestion_error.log`:**
```
============================================================
Document 3 (fake.pdf) failed at 2024-01-15 10:30:45
Traceback (most recent call last):
  File "backend/rag_service.py", line 75, in process_and_index_pdf
    loader = PyPDFLoader(filepath)
  File "langchain_community/document_loaders/pdf.py", line 120, in load
    raise PyPDFParserError("Cannot find pdf header")
PyPDFParserError: Cannot find pdf header
```

**Expected Behavior:** ✅ Detailed error in log file, user sees "Failed" status

---

### ✅ TEST 5: Chat with Processed Document

**Steps:**
1. Ensure at least one document is "Processed"
2. Go to "Workspace Chat"
3. Ask a question about the document
4. Monitor logs

**Check Console:**
```
[CHAT] Query received - user_id=1, question_len=45
[RAG] Query started - user_id=1, query_len=45, k=10
[RAG] Vector store connected
[RAG] Searching for 10 most similar chunks (threshold: 0.75)
[RAG] Retrieved 10 results from vector store
[RAG] Chunk 1: similarity=0.8234, threshold=0.75 ✓ VALID
[RAG] Chunk 2: similarity=0.7156, threshold=0.75 ✓ VALID
[RAG] Chunk 3: similarity=0.6234, threshold=0.75 ✗ FILTERED OUT
... (more chunks)
[RAG] Valid chunks after similarity filtering: 8/10
[RAG] Generating answer from 8 document chunks
[RAG] Answer generated successfully from 8 sources
[CHAT] Query completed - 8 sources returned
```

**Frontend Result:** Answer appears with source citations ✅

---

### ✅ TEST 6: Chat Without Documents (Fallback)

**Steps:**
1. Ensure NO documents processed
2. Ask a question
3. System should use web search

**Check Console:**
```
[CHAT] Query received - user_id=2, question_len=50
[RAG] Query started - user_id=2, query_len=50, k=10
[RAG] Vector store connected
[RAG] Searching for 10 most similar chunks
[RAG] Retrieved 0 results from vector store
[RAG] Valid chunks after similarity filtering: 0/0
[RAG] No valid chunks found (similarity < 0.75), using web search
[WEB_SEARCH] Searching web for: What is cloud computing?
[WEB_SEARCH] Found web results
[RAG] Generating answer from web search results
[RAG] Answer generated from web search
```

**Frontend Result:** Answer from web search with web source citations ✅

---

## 📊 Log Monitoring

### View Real-Time Logs

**Watch all upload activity:**
```bash
tail -f /path/to/app/debug.log | grep "\[UPLOAD\]"
```

**Watch all ingestion activity:**
```bash
tail -f /path/to/app/debug.log | grep "\[INGESTION\]"
```

**Watch all errors:**
```bash
tail -f /path/to/app/debug.log | grep "ERROR"
```

**Filter by document ID:**
```bash
grep "doc_id=5" /path/to/app/debug.log
```

### Check Error Log File

```bash
# View entire error log
cat ingestion_error.log

# View latest errors
tail -50 ingestion_error.log

# Count failed documents
grep "^Document" ingestion_error.log | wc -l

# Search for specific error type
grep "PyPDFParserError" ingestion_error.log
```

---

## 🐛 Troubleshooting Guide

### Issue: "No logs appearing"

**Check 1:** Logger is configured
```python
# backend/rag_service.py should have:
import logging
logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**Check 2:** Backend is running
```bash
python main.py  # Should show startup messages
```

**Check 3:** FastAPI logs to console
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

### Issue: "Chat endpoint returns error"

**Check:**
```bash
# Verify query_rag exists in rag_service.py
grep "^def query_rag" backend/rag_service.py

# Should output:
# def query_rag(query: str, user_id: int, k: int = 10, similarity_threshold: float = 0.75):

# If not found, file wasn't updated correctly
```

---

### Issue: "Upload says 'Unsupported file' for valid PDF"

**Check Logs:**
1. Look for `[UPLOAD]` prefix in console
2. Search for error reason:
   - `Non-PDF extension` → file extension issue
   - `Unusual MIME type` → browser sent non-standard MIME
   - `File is empty` → empty file uploaded
   - `Error processing document` → PDF parsing failed

**Example diagnosis:**
```bash
# Find the upload in logs
grep "filename=myfile.pdf" debug.log

# Follow the error chain
[UPLOAD] File saved successfully
[UPLOAD] File size: 2847361 bytes
[UPLOAD] Document record created - doc_id=5
[INGESTION] Error processing document: Cannot find pdf header
# → Real issue is PDF corruption, not "unsupported file"
```

---

### Issue: "Milvus embedding failed"

**Check Console:**
```python
# Look for Google Gemini API error
[RAG] Query started
[RAG] Vector store connected
# ERROR: Could not connect to Google Gemini API

# Fix: Check GOOGLE_API_KEY environment variable
export GOOGLE_API_KEY="your-key-here"
python main.py
```

---

## 📈 Performance Monitoring

### Monitor Upload Processing Time

```bash
# Extract upload start and completion
grep "\[UPLOAD\] New upload" debug.log
# 2024-01-15 10:30:45,123 - backend.main - INFO - [UPLOAD] New upload...

grep "\[INGESTION\] Document marked as COMPLETED" debug.log  
# 2024-01-15 10:31:02,456 - backend.rag_service - INFO - [INGESTION] Document...

# Time difference: ~17 seconds for this PDF
```

### Monitor Query Response Time

```bash
# Extract chat query start and completion
grep "\[CHAT\] Query received" debug.log
# 2024-01-15 10:35:01,234 - backend.main - INFO - [CHAT] Query...

grep "\[CHAT\] Query completed" debug.log
# 2024-01-15 10:35:03,567 - backend.main - INFO - [CHAT] Query...

# Response time: ~2.3 seconds for this query
```

---

## ✅ Health Check Checklist

Run these tests to verify all fixes are working:

- [ ] Upload valid PDF → logged with [UPLOAD] tags → marked as "Processed"
- [ ] Upload non-PDF → shows "Invalid file extension" error
- [ ] Upload 0-byte PDF → shows "File is empty" error
- [ ] Upload corrupted PDF → shows error in frontend + error in ingestion_error.log
- [ ] Chat with documents → shows [CHAT] and [RAG] logs → answer with sources
- [ ] Chat without documents → falls back to web search with [WEB_SEARCH] logs
- [ ] Frontend shows detailed error messages (not generic)
- [ ] Console logs have [PREFIX] tags (UPLOAD, INGESTION, RAG, CHAT, etc.)
- [ ] ingestion_error.log captures failed uploads with full traceback
- [ ] Upload logs show: extension ✓ MIME ✓ file size ✓ DB save ✓ task queue

---

## 📞 Debug Commands

### Check what files are uploaded
```bash
ls -lh uploads/
```

### Check database documents
```python
# In Python shell or script
from backend.database import SessionLocal
from backend.models import Document

db = SessionLocal()
docs = db.query(Document).all()
for doc in docs:
    print(f"ID: {doc.id}, Status: {doc.status}, File: {doc.filename}")
db.close()
```

### Check Milvus indexed chunks
```python
from backend.rag_service import get_vector_store

vector_store = get_vector_store()
# Get collection info (requires pymilvus)
```

### Test query_rag directly
```python
from backend.rag_service import query_rag

answer, sources = query_rag(
    query="What is in the document?",
    user_id=1,
    k=5
)

print(f"Answer: {answer}")
print(f"Sources: {len(sources)}")
```

---

## 🎯 Next Steps

1. **Run through all 6 test scenarios** to verify fixes
2. **Monitor logs** during testing to understand flow
3. **Check ingestion_error.log** for any real issues
4. **Verify frontend** displays detailed errors
5. **Test with multiple PDFs** to ensure consistency
6. **Monitor performance** (upload time, query time)

You now have a fully observable, debuggable RAG pipeline! 🚀
