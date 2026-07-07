import React, { useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { AlertCircle, RotateCcw, CloudUpload, LoaderCircle, FolderOpen, Files, CheckCircle2, FileText, FileX, Trash2, ArrowRight, MessageCircle, X, Circle, Check, Blocks, Binary } from 'lucide-react';

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function Dashboard({ 
  documents, 
  uploading, 
  uploadProgress, 
  uploadError, 
  setUploadError, 
  handleFileUpload, 
  handleDeleteDocument, 
  setActiveTab,
  dragActive,
  setDragActive
}) {
  const fileInputRef = useRef(null);

  const completedDocs = documents.filter(d => d.status === 'completed');
  const processingDocs = documents.filter(d => d.status === 'processing');
  const failedDocs = documents.filter(d => d.status === 'failed');

  const hasFiles = documents.length > 0;
  const isCurrentlyProcessing = processingDocs.length > 0;
  const hasFailedFiles = failedDocs.length > 0 || !!uploadError;

  const stepIngestionStatus = hasFailedFiles ? 'failed' : (hasFiles ? 'completed' : 'pending');
  const stepChunkingStatus = hasFailedFiles ? 'inactive' : (hasFiles ? (isCurrentlyProcessing ? 'active' : 'completed') : 'pending');
  const stepEmbeddingStatus = hasFailedFiles ? 'inactive' : (hasFiles ? (isCurrentlyProcessing ? 'active' : 'completed') : 'pending');
  const stepIndexingStatus = hasFailedFiles ? 'inactive' : (hasFiles ? (isCurrentlyProcessing ? 'active' : 'completed') : 'pending');

  const totalChunks = completedDocs.length * 28; 

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <div className="flex gap-8 max-w-6xl mx-auto items-stretch">
        
        {/* Upload & Files Section */}
        <section className="w-[50%] shrink-0 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-2xl leading-8 tracking-tight">Upload Documents</h1>
            <p className="text-neutral-500 text-sm leading-5">Add your files to build the knowledge base</p>
          </div>
          
          {hasFailedFiles ? (
            <div className="text-center rounded-2xl bg-[#e7000b]/5 border-[#e7000b]/50 border-2 border-dashed flex p-8 flex-col justify-center items-center gap-3">
              <div className="size-12 rounded-full bg-[#e7000b]/10 text-[#e7000b] flex justify-center items-center">
                <AlertCircle className="size-6" />
              </div>
              <p className="font-semibold text-[#e7000b] text-base leading-6">Upload failed: unsupported file type or corrupted file</p>
              <p className="text-neutral-500 text-sm leading-5">Please remove the invalid file and try again</p>
              <button 
                className="inline-flex text-white font-medium rounded-xl bg-[#e7000b] text-sm leading-5 px-4 py-2 justify-center items-center gap-2 hover:bg-[#e7000b]/90 transition-colors"
                onClick={() => {
                  setUploadError('');
                  const failed = documents.filter(d => d.status === 'failed');
                  failed.forEach(d => handleDeleteDocument({ stopPropagation: () => {} }, d.id));
                }}
              >
                <RotateCcw className="size-4 animate-spin-slow" />
                Retry Upload
              </button>
            </div>
          ) : (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".pdf"
                onChange={e => handleFileUpload(e.target.files[0])}
              />
              <div 
                className={`text-center rounded-2xl bg-neutral-900/5 border-neutral-900/40 border-2 border-dashed flex p-8 flex-col justify-center items-center gap-2 cursor-pointer transition-all ${dragActive ? 'bg-neutral-900/10 border-neutral-900/80 shadow-md' : 'hover:bg-neutral-900/10'}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="size-12 rounded-full bg-neutral-900/10 flex mb-2 justify-center items-center">
                  {uploading ? <LoaderCircle className="size-6 text-neutral-900 animate-spin" /> : <CloudUpload className="size-6 text-neutral-900" />}
                </div>
                <p className="font-semibold text-base leading-6">{uploading ? 'Parsing uploaded file...' : 'Drag & Drop your files here'}</p>
                <p className="text-neutral-500 text-sm leading-5">or click to browse</p>
                <Button className="mt-2 gap-2" disabled={uploading}>
                  <FolderOpen className="size-4" /> Browse Files
                </Button>
              </div>
            </>
          )}
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden shadow-inner">
              <div className="bg-neutral-900 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
          <p className="text-neutral-500 text-xs leading-4">Supports PDF documents up to 50MB</p>
          
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[340px] custom-scrollbar pr-1">
            {documents.length === 0 ? (
              <Card className="p-6 gap-4 border-neutral-200 shadow-sm">
                <CardContent className="text-center flex p-0 flex-col items-center gap-3">
                  <div className="size-14 rounded-full bg-neutral-100 text-neutral-500 flex justify-center items-center mx-auto mb-2">
                    <Files className="size-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="font-semibold text-lg leading-7 tracking-tight">No documents uploaded yet</h2>
                    <p className="text-neutral-500 text-sm leading-5">Upload files to start building your knowledge base and enable question answering.</p>
                  </div>
                  <div className="flex pt-1 flex-wrap justify-center items-center gap-2">
                    <Badge variant="secondary" className="gap-1 bg-neutral-100 text-neutral-800 border-0">
                      <CheckCircle2 className="size-3" /> Ready for upload
                    </Badge>
                    <Badge variant="outline" className="gap-1 border-neutral-200 text-neutral-600">
                      <FileText className="size-3" /> PDF Only
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="rounded-2xl bg-white border-neutral-200 border border-solid p-4 hover:border-neutral-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`size-10 shrink-0 rounded-xl flex justify-center items-center ${doc.status === 'failed' ? 'bg-[#e7000b]/10 text-[#e7000b]' : 'bg-neutral-100 text-neutral-950'}`}>
                      {doc.status === 'failed' ? <FileX className="size-5" /> : <FileText className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm leading-5" title={doc.filename}>{doc.filename}</div>
                      <div className="text-neutral-500 text-xs leading-4">{formatSize(doc.file_size)}</div>
                    </div>
                    
                    {doc.status === 'completed' && (
                      <div className="inline-flex font-medium rounded-full bg-neutral-100 text-neutral-900 text-xs leading-4 px-2.5 py-1 items-center gap-1 shadow-none">
                        <CheckCircle2 className="size-3" /> Processed
                      </div>
                    )}
                    {doc.status === 'processing' && (
                      <div className="inline-flex font-medium rounded-full bg-yellow-50 text-yellow-600 text-xs leading-4 px-2.5 py-1 items-center gap-1 shadow-none animate-pulse">
                        <LoaderCircle className="size-3 animate-spin" /> Processing
                      </div>
                    )}
                    {doc.status === 'failed' && (
                      <div className="inline-flex font-medium rounded-full bg-[#e7000b]/10 text-[#e7000b] text-xs leading-4 px-2.5 py-1 items-center gap-1 shadow-none">
                        <XCircle className="size-3" /> Failed
                      </div>
                    )}
                    
                    <button 
                      className="inline-flex size-8 rounded-lg text-[#e7000b] hover:bg-red-50 justify-center items-center transition-colors"
                      onClick={(e) => handleDeleteDocument(e, doc.id)}
                      title="Delete File"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {hasFailedFiles ? (
            <button className="inline-flex font-medium rounded-xl bg-neutral-100 text-neutral-500 text-sm leading-5 mt-auto px-4 py-3 justify-center items-center gap-2 w-full cursor-not-allowed">
              <MessageCircle className="size-4" /> Fix Upload Issues to Continue <ArrowRight className="size-4" />
            </button>
          ) : (
            <Button className="mt-auto gap-2 w-full" disabled={completedDocs.length === 0} onClick={() => setActiveTab('chat')}>
              <MessageCircle className="size-4" /> Process & Continue to Chat <ArrowRight className="size-4" />
            </Button>
          )}
        </section>

        {/* Pipeline Status Section */}
        <section className="min-w-0 flex flex-col flex-1 gap-6 ml-4">
          <h2 className="font-bold text-xl leading-7 tracking-tight">Pipeline Status</h2>
          <div className="rounded-2xl bg-white border-neutral-200 border border-solid p-6 shadow-sm">
            <div className="flex flex-col gap-5">
              
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`size-8 rounded-full ${stepIngestionStatus === 'failed' ? 'bg-[#e7000b] text-white' : stepIngestionStatus === 'completed' ? 'bg-[#009689] text-white' : 'bg-neutral-100 text-neutral-500 border-neutral-200 border-2'} flex justify-center items-center`}>
                    {stepIngestionStatus === 'failed' ? <X className="size-4" /> : stepIngestionStatus === 'completed' ? <Check className="size-4" /> : <Circle className="size-3" />}
                  </div>
                  <div className={`my-1 flex-1 w-px ${stepIngestionStatus === 'failed' ? 'bg-[#e7000b]/30' : stepIngestionStatus === 'completed' ? 'bg-[#009689]/40' : 'bg-neutral-200'}`} style={{ minHeight: '16px' }} />
                </div>
                <div className="flex pb-2 flex-col gap-1">
                  <span className="font-semibold text-sm leading-5">1. Document Ingestion</span>
                  <span className="text-neutral-500 text-xs leading-4">
                    {stepIngestionStatus === 'failed' ? 'Upload paused due to invalid file' : stepIngestionStatus === 'completed' ? 'Files parsed and loaded' : 'Waiting for files'}
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`flex gap-4 ${stepChunkingStatus === 'inactive' ? 'opacity-50' : ''}`}>
                <div className="flex flex-col items-center">
                  <div className={`size-8 rounded-full ${stepChunkingStatus === 'completed' ? 'bg-[#009689] text-white' : stepChunkingStatus === 'active' ? 'bg-neutral-900/10' : 'bg-neutral-100 text-neutral-500 border-neutral-200 border-2'} flex justify-center items-center`}>
                    {stepChunkingStatus === 'completed' ? <Check className="size-4" /> : stepChunkingStatus === 'active' ? <LoaderCircle className="size-4 animate-spin text-neutral-900" /> : <Circle className="size-3" />}
                  </div>
                  <div className={`my-1 flex-1 w-px ${stepChunkingStatus === 'completed' ? 'bg-[#009689]/40' : 'bg-neutral-200'}`} style={{ minHeight: '16px' }} />
                </div>
                <div className="flex pb-2 flex-col gap-1">
                  <span className={`font-semibold text-sm leading-5 ${stepChunkingStatus === 'inactive' || stepChunkingStatus === 'pending' ? 'text-neutral-500' : ''}`}>2. Text Chunking</span>
                  <span className="text-neutral-500 text-xs leading-4">
                    {stepChunkingStatus === 'completed' ? 'Documents split' : stepChunkingStatus === 'active' ? 'Chunking active...' : 'Waiting for ingestion'}
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`flex gap-4 ${stepEmbeddingStatus === 'inactive' ? 'opacity-50' : ''}`}>
                <div className="flex flex-col items-center">
                  <div className={`size-8 rounded-full ${stepEmbeddingStatus === 'completed' ? 'bg-[#009689] text-white' : stepEmbeddingStatus === 'active' ? 'bg-neutral-900/10' : 'bg-neutral-100 text-neutral-500 border-neutral-200 border-2'} flex justify-center items-center`}>
                    {stepEmbeddingStatus === 'completed' ? <Check className="size-4" /> : stepEmbeddingStatus === 'active' ? <LoaderCircle className="size-4 animate-spin text-neutral-900" /> : <Circle className="size-3" />}
                  </div>
                  <div className={`my-1 flex-1 w-px ${stepEmbeddingStatus === 'completed' ? 'bg-[#009689]/40' : 'bg-neutral-200'}`} style={{ minHeight: '16px' }} />
                </div>
                <div className="flex pb-2 flex-col gap-1">
                  <span className={`font-semibold text-sm leading-5 ${stepEmbeddingStatus === 'inactive' || stepEmbeddingStatus === 'pending' ? 'text-neutral-500' : ''}`}>3. Embedding Generation</span>
                  <span className="text-neutral-500 text-xs leading-4">
                    {stepEmbeddingStatus === 'completed' ? 'Embeddings created' : stepEmbeddingStatus === 'active' ? 'Calculating text embeddings...' : 'Waiting for chunks'}
                  </span>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`flex gap-4 ${stepIndexingStatus === 'inactive' ? 'opacity-50' : ''}`}>
                <div className="flex flex-col items-center">
                  <div className={`size-8 rounded-full ${stepIndexingStatus === 'completed' ? 'bg-[#009689] text-white' : stepIndexingStatus === 'active' ? 'bg-neutral-900/10' : 'bg-neutral-100 text-neutral-500 border-neutral-200 border-2'} flex justify-center items-center`}>
                    {stepIndexingStatus === 'completed' ? <Check className="size-4" /> : stepIndexingStatus === 'active' ? <LoaderCircle className="size-4 animate-spin text-neutral-900" /> : <Circle className="size-3" />}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`font-semibold text-sm leading-5 ${stepIndexingStatus === 'inactive' || stepIndexingStatus === 'pending' ? 'text-neutral-500' : ''}`}>4. Vector Store Indexing</span>
                  <span className="text-neutral-500 text-xs leading-4">
                    {stepIndexingStatus === 'completed' ? 'Stored in Milvus' : stepIndexingStatus === 'active' ? 'Writing index...' : 'Waiting for embeddings'}
                  </span>
                </div>
              </div>

            </div>
          </div>
          
          {/* Small Info Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-neutral-100/40 border-neutral-200 border border-solid p-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-neutral-100 text-neutral-950 flex justify-center items-center">
                  <Files className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-2xl leading-8">{completedDocs.length}</span>
                  <span className="text-neutral-500 text-xs leading-4 mt-1">Documents Loaded</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-neutral-100/40 border-neutral-200 border border-solid p-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-neutral-100 text-neutral-950 flex justify-center items-center">
                  <Blocks className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-2xl leading-8">{totalChunks}</span>
                  <span className="text-neutral-500 text-xs leading-4 mt-1">Chunks Created</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-neutral-100/40 border-neutral-200 border border-solid p-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-neutral-100 text-neutral-950 flex justify-center items-center">
                  <Binary className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-2xl leading-8">{totalChunks > 0 ? `${totalChunks}/${totalChunks}` : '0/0'}</span>
                  <span className="text-neutral-500 text-xs leading-4 mt-1">Embeddings</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
