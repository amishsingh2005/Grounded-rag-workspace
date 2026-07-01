import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Binary,
  Blocks,
  Boxes,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  CloudUpload,
  Database,
  FileSpreadsheet,
  FileText,
  FileX,
  Files,
  FolderOpen,
  History,
  LayoutDashboard,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
  XCircle,
  LogOut,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";

// Dynamically target backend port in dev, or relative paths in production
const API_BASE = window.location.port === '5173' ? 'http://localhost:8000' : '';

export default function App() {
  // Navigation State: 'dashboard', 'documents', 'chat', 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // RAG / Core Data State
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [retrievalError, setRetrievalError] = useState(null);

  // Retrieval Parameter Settings (Dynamic Grounding Sliders)
  const [topK, setTopK] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch current user details & files if token exists
  useEffect(() => {
    if (token) {
      fetchUser();
      fetchDocuments();
    } else {
      setUser(null);
      setDocuments([]);
    }
  }, [token]);

  // Polling for processing documents
  useEffect(() => {
    if (!token) return;
    
    const hasProcessing = documents.some(doc => doc.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, token]);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error('Error fetching user', e);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        
        // Auto-select first completed document if none selected
        if (data.length > 0 && !selectedDoc) {
          const completed = data.find(d => d.status === 'completed');
          if (completed) setSelectedDoc(completed);
        }
      }
    } catch (e) {
      console.error('Error fetching documents', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setMessages([]);
    setDocuments([]);
    setSelectedDoc(null);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!email || !password) {
      setAuthError('Please fill in all fields');
      return;
    }

    try {
      if (authMode === 'register') {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          await loginUser(email, password);
        } else {
          setAuthError(data.detail || 'Registration failed');
        }
      } else {
        await loginUser(email, password);
      }
    } catch (e) {
      setAuthError('Network error. Please try again.');
    }
  };

  const loginUser = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch(`${API_BASE}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        setEmail('');
        setPassword('');
      } else {
        setAuthError(data.detail || 'Invalid email or password');
      }
    } catch (e) {
      setAuthError('Network error. Please try again.');
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      setUploadError('Only PDF files are supported (.pdf extension required).');
      return;
    }

    setUploading(true);
    setUploadProgress(20);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(50);
      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      setUploadProgress(80);
      const data = await res.json();
      if (res.ok) {
        setDocuments(prev => [data, ...prev]);
        setSelectedDoc(data);
        setUploadProgress(100);
        console.log('[UPLOAD] File uploaded successfully', data);
      } else {
        // Extract detailed error message from backend
        const errorMessage = data.detail || 'Upload failed';
        console.error('[UPLOAD] Upload failed:', errorMessage);
        setUploadError(errorMessage);
      }
    } catch (err) {
      console.error('[UPLOAD] Network error:', err);
      setUploadError('Network error during file upload. Please check your connection.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Drag and Drop Handlers
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

  const handleDeleteDocument = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        if (selectedDoc && selectedDoc.id === id) {
          setSelectedDoc(null);
        }
      }
    } catch (e) {
      console.error('Error deleting document', e);
    }
  };

  const triggerChat = async (questionText) => {
    if (!questionText.trim() || chatLoading) return;

    const userMessage = { sender: 'user', text: questionText };
    setMessages(prev => [...prev, userMessage]);
    setChatLoading(true);
    setRetrievalError(null);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: questionText, top_k: topK, similarity_threshold: similarityThreshold })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { 
          sender: 'bot', 
          text: data.answer,
          sources: data.sources 
        }]);
      } else {
        setRetrievalError({
          code: 'VECTOR_SEARCH_TIMEOUT',
          title: 'Retrieval Failed — Vector Search Timeout',
          message: data.detail || 'The system could not retrieve relevant chunks from your knowledge base. The vector search service timed out before returning results. This is usually a temporary issue.',
          time: new Date().toLocaleTimeString(),
          question: questionText
        });
      }
    } catch (err) {
      setRetrievalError({
        code: 'CONNECTION_FAILED',
        title: 'Retrieval Failed — Connection Timeout',
        message: 'The system could not connect to the remote vector database instance. Please verify network routing and local Milvus service status.',
        time: new Date().toLocaleTimeString(),
        question: questionText
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    triggerChat(inputMessage);
    setInputMessage('');
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Auth View (Light Theme Matching "Cognitive Slate")
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white max-w-sm w-full rounded-xl border border-neutral-200 p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-lg bg-neutral-900 flex justify-center items-center mx-auto mb-4">
              <Boxes className="size-6 text-neutral-50" />
            </div>
            <h1 className="font-bold text-xl text-neutral-950">DocuIntel AI</h1>
            <p className="text-sm text-neutral-500 mt-1">Enterprise RAG Console</p>
          </div>

          <div className="flex bg-neutral-100 rounded-lg p-[3px] mb-6">
            <button 
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${authMode === 'login' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-950'}`}
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
            >
              Log In
            </button>
            <button 
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${authMode === 'register' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500 hover:text-neutral-950'}`}
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm mb-4">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-700 font-semibold mb-1">Email Address</label>
              <input 
                type="email" 
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                placeholder="name@company.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-700 font-semibold mb-1">Password</label>
              <input 
                type="password" 
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full mt-4 font-semibold">
              {authMode === 'login' ? 'Access Workspace' : 'Create Account'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard calculations
  const completedDocs = documents.filter(d => d.status === 'completed');
  const processingDocs = documents.filter(d => d.status === 'processing');
  const failedDocs = documents.filter(d => d.status === 'failed');
  
  // Pipeline Step States (Dynamic states with Ingestion Error support)
  const hasFiles = documents.length > 0;
  const isCurrentlyProcessing = processingDocs.length > 0;
  const hasFailedFiles = failedDocs.length > 0 || !!uploadError;

  const stepIngestionStatus = hasFailedFiles ? 'failed' : (hasFiles ? 'completed' : 'pending');
  const stepChunkingStatus = hasFailedFiles ? 'inactive' : (hasFiles ? (isCurrentlyProcessing ? 'active' : 'completed') : 'pending');
  const stepEmbeddingStatus = hasFailedFiles ? 'inactive' : (hasFiles ? (isCurrentlyProcessing ? 'active' : 'completed') : 'pending');
  const stepIndexingStatus = hasFailedFiles ? 'inactive' : (hasFiles ? (isCurrentlyProcessing ? 'active' : 'completed') : 'pending');

  const totalChunks = completedDocs.length * 28; // Simulated chunks

  return (
    <div className="bg-white text-neutral-950 w-full h-full min-h-screen w-screen min-w-screen max-w-screen overflow-hidden flex flex-col">
      
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-neutral-200 border-t-0 border-r-0 border-b border-solid flex px-8 justify-between items-center w-full h-16 z-30">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-neutral-900 flex justify-center items-center shadow-sm">
            <Boxes className="size-5 text-neutral-50" />
          </div>
          <span className="font-bold text-lg leading-7 tracking-tight">
            RAG Pipeline
          </span>
        </div>
        
        {/* Connection status badge (matches reference screen layouts) */}
        {retrievalError ? (
          <div className="rounded-full bg-[#e7000b]/10 border border-[#e7000b]/30 flex px-4 py-1.5 items-center gap-2 shadow-sm animate-pulse">
            <span className="size-2 rounded-full bg-[#e7000b]" />
            <span className="font-semibold text-[#e7000b] text-xs leading-5">
              Retrieval Error — Knowledge Base Unavailable
            </span>
          </div>
        ) : (
          <div className="rounded-full bg-neutral-100 border border-neutral-200 flex px-4 py-1.5 items-center gap-2 shadow-sm">
            <span className={`size-2 rounded-full ${hasFailedFiles ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`} />
            <span className="font-medium text-neutral-950 text-xs leading-5">
              {hasFailedFiles ? 'Knowledge Base Ingestion Suspended' : `Knowledge Base Ready — ${completedDocs.length} ${completedDocs.length === 1 ? 'Document' : 'Documents'}`}
            </span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Button size="sm" variant="ghost" className="size-8 p-0 rounded-full">
            <Bell className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-neutral-100 flex justify-center items-center border border-neutral-200 shadow-inner">
              <User className="size-4 text-neutral-500" />
            </div>
            <button onClick={handleLogout} className="text-neutral-500 hover:text-red-600 p-1.5 rounded transition-colors" title="Log Out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Body Layout ────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        
        {/* ── Left Sidebar Navigation ────────────────────────────────── */}
        <aside className="shrink-0 bg-neutral-50 border-neutral-200 border-t-0 border-r border-b-0 border-l-0 border-solid flex p-4 flex-col gap-1 w-56 select-none">
          <div className="flex flex-col gap-1 w-full">
            <div 
              className={`rounded-xl flex px-4 py-2.5 items-center gap-2.5 cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'bg-neutral-900 text-neutral-50 shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard className="size-4" />
              <span className="font-medium text-sm leading-5">Dashboard</span>
            </div>
            
            <div 
              className={`rounded-xl flex px-4 py-2.5 items-center gap-2.5 cursor-pointer transition-colors ${activeTab === 'documents' ? 'bg-neutral-900 text-neutral-50 shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}
              onClick={() => setActiveTab('documents')}
            >
              <FileText className="size-4" />
              <span className="font-medium text-sm leading-5">Documents Viewer</span>
            </div>
            
            <div 
              className={`rounded-xl flex px-4 py-2.5 items-center gap-2.5 cursor-pointer transition-colors ${activeTab === 'chat' ? 'bg-neutral-900 text-neutral-50 shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageCircle className="size-4" />
              <span className="font-medium text-sm leading-5">Workspace Chat</span>
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-neutral-200 flex flex-col gap-1 w-full">
            <div 
              className="rounded-xl flex px-4 py-2.5 items-center gap-2.5 cursor-pointer transition-colors text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
              onClick={() => { setMessages([]); setRetrievalError(null); setActiveTab('chat'); }}
            >
              <History className="size-4" />
              <span className="font-medium text-sm leading-5">Reset Console</span>
            </div>
            <div 
              className={`rounded-xl flex px-4 py-2.5 items-center gap-2.5 cursor-pointer transition-colors ${activeTab === 'settings' ? 'bg-neutral-900 text-neutral-50 shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="size-4" />
              <span className="font-medium text-sm leading-5">Settings</span>
            </div>
          </div>
        </aside>

        {/* ── Main Workspace ─────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 overflow-hidden bg-white">
          
          {/* ─────────────────────────────────────────────────────────────
              TAB: DASHBOARD
              ───────────────────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="p-8 h-full overflow-y-auto custom-scrollbar">
              <div className="flex gap-8 max-w-6xl mx-auto items-stretch">
                
                {/* Upload & Files Section */}
                <section className="w-[50%] shrink-0 flex flex-col gap-6">
                  <div className="flex flex-col gap-1">
                    <h1 className="font-bold text-2xl leading-8 tracking-tight">
                      Upload Documents
                    </h1>
                    <p className="text-neutral-500 text-sm leading-5">
                      Add your files to build the knowledge base
                    </p>
                  </div>
                  
                  {/* Ingestion Error state uploader (matches mockup 3 layout) */}
                  {hasFailedFiles ? (
                    <div className="text-center rounded-2xl bg-[#e7000b]/5 border-[#e7000b]/50 border-2 border-dashed flex p-8 flex-col justify-center items-center gap-3">
                      <div className="size-12 rounded-full bg-[#e7000b]/10 text-[#e7000b] flex justify-center items-center">
                        <AlertCircle className="size-6" />
                      </div>
                      <p className="font-semibold text-[#e7000b] text-base leading-6">
                        Upload failed: unsupported file type or corrupted file
                      </p>
                      <p className="text-neutral-500 text-sm leading-5">
                        Please remove the invalid file and try again
                      </p>
                      <button 
                        className="inline-flex text-white font-medium rounded-xl bg-[#e7000b] text-sm leading-5 px-4 py-2 justify-center items-center gap-2 hover:bg-[#e7000b]/90 transition-colors"
                        onClick={() => {
                          setUploadError('');
                          // Clear failed documents
                          const failed = documents.filter(d => d.status === 'failed');
                          failed.forEach(d => handleDeleteDocument({ stopPropagation: () => {} }, d.id));
                        }}
                      >
                        <RotateCcw className="size-4 animate-spin-slow" />
                        Retry Upload
                      </button>
                    </div>
                  ) : (
                    /* Standard Uploader Drop Zone */
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
                          {uploading ? (
                            <LoaderCircle className="size-6 text-neutral-900 animate-spin" />
                          ) : (
                            <CloudUpload className="size-6 text-neutral-900" />
                          )}
                        </div>
                        <p className="font-semibold text-base leading-6">
                          {uploading ? 'Parsing uploaded file...' : 'Drag & Drop your files here'}
                        </p>
                        <p className="text-neutral-500 text-sm leading-5">
                          or click to browse
                        </p>
                        <Button className="mt-2 gap-2" disabled={uploading}>
                          <FolderOpen className="size-4" />
                          Browse Files
                    </Button>
                      </div>
                    </>
                  )}
                  
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden shadow-inner">
                      <div className="bg-neutral-900 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                  <p className="text-neutral-500 text-xs leading-4">
                    Supports PDF documents up to 50MB
                  </p>
                  
                  {/* File List / Empty state card (matches mockup 4) */}
                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[340px] custom-scrollbar pr-1">
                    {documents.length === 0 ? (
                      <Card className="p-6 gap-4 border-neutral-200 shadow-sm">
                        <CardContent className="text-center flex p-0 flex-col items-center gap-3">
                          <div className="size-14 rounded-full bg-neutral-100 text-neutral-500 flex justify-center items-center mx-auto mb-2">
                            <Files className="size-6" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <h2 className="font-semibold text-lg leading-7 tracking-tight">
                              No documents uploaded yet
                            </h2>
                            <p className="text-neutral-500 text-sm leading-5">
                              Upload files to start building your knowledge base
                              and enable question answering.
                            </p>
                          </div>
                          <div className="flex pt-1 flex-wrap justify-center items-center gap-2">
                            <Badge variant="secondary" className="gap-1 bg-neutral-100 text-neutral-800 border-0">
                              <CheckCircle2 className="size-3" />
                              Ready for upload
                            </Badge>
                            <Badge variant="outline" className="gap-1 border-neutral-200 text-neutral-600">
                              <FileText className="size-3" />
                              PDF, DOCX, TXT, CSV
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      documents.map(doc => (
                        <div 
                          key={doc.id} 
                          className="rounded-2xl bg-white border-neutral-200 border border-solid p-4 hover:border-neutral-300 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`size-10 shrink-0 rounded-xl flex justify-center items-center ${doc.status === 'failed' ? 'bg-[#e7000b]/10 text-[#e7000b]' : 'bg-neutral-100 text-neutral-950'}`}>
                              {doc.status === 'failed' ? <FileX className="size-5" /> : <FileText className="size-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-sm leading-5" title={doc.filename}>
                                {doc.filename}
                              </div>
                              <div className="text-neutral-500 text-xs leading-4">
                                {formatSize(doc.file_size)}
                              </div>
                            </div>
                            
                            {doc.status === 'completed' && (
                              <div className="inline-flex font-medium rounded-full bg-neutral-100 text-neutral-900 text-xs leading-4 px-2.5 py-1 items-center gap-1 shadow-none">
                                <CheckCircle2 className="size-3" />
                                Processed
                              </div>
                            )}
                            {doc.status === 'processing' && (
                              <div className="inline-flex font-medium rounded-full bg-yellow-50 text-yellow-600 text-xs leading-4 px-2.5 py-1 items-center gap-1 shadow-none animate-pulse">
                                <LoaderCircle className="size-3 animate-spin" />
                                Processing
                              </div>
                            )}
                            {doc.status === 'failed' && (
                              <div className="inline-flex font-medium rounded-full bg-[#e7000b]/10 text-[#e7000b] text-xs leading-4 px-2.5 py-1 items-center gap-1 shadow-none">
                                <XCircle className="size-3" />
                                Failed
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
                  
                  {/* Action button (disables and changes text if upload has failed files) */}
                  {hasFailedFiles ? (
                    <button className="inline-flex font-medium rounded-xl bg-neutral-100 text-neutral-500 text-sm leading-5 mt-auto px-4 py-3 justify-center items-center gap-2 w-full cursor-not-allowed">
                      <MessageCircle className="size-4" />
                      Fix Upload Issues to Continue
                      <ArrowRight className="size-4" />
                    </button>
                  ) : (
                    <Button 
                      className="mt-auto gap-2 w-full"
                      disabled={completedDocs.length === 0}
                      onClick={() => setActiveTab('chat')}
                    >
                      <MessageCircle className="size-4" />
                      Process & Continue to Chat
                      <ArrowRight className="size-4" />
                    </Button>
                  )}
                </section>

                {/* Pipeline Status Section */}
                <section className="min-w-0 flex flex-col flex-1 gap-6 ml-4">
                  <h2 className="font-bold text-xl leading-7 tracking-tight">
                    Pipeline Status
                  </h2>
                  <div className="rounded-2xl bg-white border-neutral-200 border border-solid p-6 shadow-sm">
                    <div className="flex flex-col gap-5">
                      
                      {/* Step 1 */}
                      {stepIngestionStatus === 'failed' ? (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 text-white rounded-full bg-[#e7000b] flex justify-center items-center">
                              <X className="size-4" />
                            </div>
                            <div className="bg-[#e7000b]/30 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-sm leading-5">
                              1. Document Ingestion
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Upload paused due to invalid file input
                            </span>
                          </div>
                        </div>
                      ) : stepIngestionStatus === 'completed' ? (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 shrink-0 rounded-full bg-[#009689] text-white flex justify-center items-center">
                              <Check className="size-4" />
                            </div>
                            <div className="bg-[#009689]/40 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-sm leading-5">
                              1. Document Ingestion
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Files parsed and loaded into the pipeline
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 rounded-full bg-neutral-100 text-neutral-500 border-neutral-200 border-2 border-solid flex justify-center items-center">
                              <Circle className="size-3" />
                            </div>
                            <div className="bg-neutral-200 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-sm leading-5">
                              1. Document Ingestion
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Waiting for files to be uploaded
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Step 2 */}
                      {stepChunkingStatus === 'inactive' ? (
                        <div className="opacity-50 flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 rounded-full bg-neutral-100 text-neutral-500 border-neutral-200 border-2 border-solid flex justify-center items-center">
                              <Circle className="size-3 text-neutral-400" />
                            </div>
                            <div className="bg-neutral-200 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-neutral-500 text-sm leading-5">
                              2. Text Chunking
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              {documents.length === 0 ? 'Waiting for ingestion to complete' : 'Waiting for successful ingestion'}
                            </span>
                          </div>
                        </div>
                      ) : stepChunkingStatus === 'completed' ? (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 shrink-0 rounded-full bg-[#009689] text-white flex justify-center items-center">
                              <Check className="size-4" />
                            </div>
                            <div className="bg-[#009689]/40 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-sm leading-5">
                              2. Text Chunking
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Documents split into overlapping text segments
                            </span>
                          </div>
                        </div>
                      ) : stepChunkingStatus === 'active' ? (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 shrink-0 rounded-full bg-neutral-900/10 flex justify-center items-center">
                              <LoaderCircle className="size-4 animate-spin text-neutral-900" />
                            </div>
                            <div className="bg-neutral-200 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-sm leading-5">
                              2. Text Chunking
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Chunking active... splitting text segments
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 rounded-full bg-neutral-100 text-neutral-500 border-neutral-200 border-2 border-solid flex justify-center items-center">
                              <Circle className="size-3" />
                            </div>
                            <div className="bg-neutral-200 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-neutral-500 text-sm leading-5">
                              2. Text Chunking
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Waiting for ingestion to complete
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Step 3 */}
                      {stepEmbeddingStatus === 'inactive' ? (
                        <div className="opacity-50 flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 rounded-full bg-neutral-100 text-neutral-500 border-neutral-200 border-2 border-solid flex justify-center items-center">
                              <Circle className="size-3 text-neutral-400" />
                            </div>
                            <div className="bg-neutral-200 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-neutral-500 text-sm leading-5">
                              3. Embedding Generation
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              {documents.length === 0 ? 'Waiting for chunks to be created' : 'Pending until documents are fixed'}
                            </span>
                          </div>
                        </div>
                      ) : stepEmbeddingStatus === 'completed' ? (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 shrink-0 rounded-full bg-[#009689] text-white flex justify-center items-center">
                              <Check className="size-4" />
                            </div>
                            <div className="bg-[#009689]/40 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-sm leading-5">
                              3. Embedding Generation
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Converting chunks into vector embeddings
                            </span>
                          </div>
                        </div>
                      ) : stepEmbeddingStatus === 'active' ? (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 shrink-0 rounded-full bg-neutral-900/10 flex justify-center items-center">
                              <LoaderCircle className="size-4 animate-spin text-neutral-900" />
                            </div>
                            <div className="bg-neutral-200 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-sm leading-5">
                              3. Embedding Generation
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Calculating text embeddings...
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 rounded-full bg-neutral-100 text-neutral-500 border-neutral-200 border-2 border-solid flex justify-center items-center">
                              <Circle className="size-3" />
                            </div>
                            <div className="bg-neutral-200 my-1 flex-1 w-px" style={{ minHeight: '16px' }} />
                          </div>
                          <div className="flex pb-2 flex-col gap-1">
                            <span className="font-semibold text-neutral-500 text-sm leading-5">
                              3. Embedding Generation
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Waiting for chunks to be created
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Step 4 */}
                      {stepIndexingStatus === 'inactive' ? (
                        <div className="opacity-50 flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 rounded-full bg-neutral-100 text-neutral-500 border-neutral-200 border-2 border-solid flex justify-center items-center">
                              <Circle className="size-3 text-neutral-400" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-neutral-500 text-sm leading-5">
                              4. Vector Store Indexing
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              {documents.length === 0 ? 'Waiting for embeddings to be generated' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ) : stepIndexingStatus === 'completed' ? (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 shrink-0 rounded-full bg-[#009689] text-white flex justify-center items-center">
                              <Check className="size-4 text-white" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-sm leading-5">
                              4. Vector Store Indexing
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Storing embeddings in the vector database
                            </span>
                          </div>
                        </div>
                      ) : stepIndexingStatus === 'active' ? (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 shrink-0 rounded-full bg-neutral-900/10 flex justify-center items-center">
                              <LoaderCircle className="size-4 animate-spin text-neutral-900" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-sm leading-5">
                              4. Vector Store Indexing
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Writing database index...
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="size-8 rounded-full bg-neutral-100 text-neutral-500 border-neutral-200 border-2 border-solid flex justify-center items-center">
                              <Circle className="size-3" />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-neutral-500 text-sm leading-5">
                              4. Vector Store Indexing
                            </span>
                            <span className="text-neutral-500 text-xs leading-4">
                              Waiting for embeddings to be generated
                            </span>
                          </div>
                        </div>
                      )}

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
                          <span className="font-bold text-2xl leading-8">
                            {completedDocs.length}
                          </span>
                          <span className="text-neutral-500 text-xs leading-4 mt-1">
                            Documents Loaded
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-neutral-100/40 border-neutral-200 border border-solid p-4">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-neutral-100 text-neutral-950 flex justify-center items-center">
                          <Blocks className="size-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-2xl leading-8">
                            {totalChunks}
                          </span>
                          <span className="text-neutral-500 text-xs leading-4 mt-1">
                            Chunks Created
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-neutral-100/40 border-neutral-200 border border-solid p-4">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-neutral-100 text-neutral-950 flex justify-center items-center">
                          <Binary className="size-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-2xl leading-8">
                            {totalChunks > 0 ? `${totalChunks}/${totalChunks}` : '0/0'}
                          </span>
                          <span className="text-neutral-500 text-xs leading-4 mt-1">
                            Embeddings
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB: DOCUMENTS VIEWER
              ───────────────────────────────────────────────────────────── */}
          {activeTab === 'documents' && (
            <div className="h-full flex flex-col overflow-hidden bg-neutral-50">
              <div className="h-12 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-neutral-600 min-w-0">
                  <FileText className="size-4 text-neutral-900" />
                  <span className="font-semibold text-neutral-900 truncate">
                    {selectedDoc ? selectedDoc.filename : 'No Document Selected'}
                  </span>
                  {selectedDoc && (
                    <>
                      <span className="text-neutral-300">•</span>
                      <span>{formatSize(selectedDoc.file_size)}</span>
                      <span className="text-neutral-300">•</span>
                      <Badge className="bg-[#009689]/10 text-[#009689] border-0 capitalize shadow-none">
                        {selectedDoc.status}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-8 flex justify-center items-start bg-neutral-100/50">
                {selectedDoc ? (
                  <Card className="bg-white w-full max-w-[800px] min-h-[900px] shadow-sm border border-neutral-200 p-12 rounded-xl">
                    <div className="space-y-6">
                      <div className="border-b border-neutral-100 pb-4">
                        <h3 className="font-bold text-xl text-neutral-900 uppercase tracking-tight">{selectedDoc.filename}</h3>
                        <p className="text-xs text-neutral-400 mt-1 font-mono">OBJECT ID: {selectedDoc.id}</p>
                      </div>
                      
                      {selectedDoc.status === 'processing' ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center text-neutral-500">
                          <LoaderCircle className="size-12 animate-spin text-neutral-900 mb-4" />
                          <h4 className="font-semibold text-lg mb-1">Analyzing Document Context</h4>
                          <p className="text-sm">We are chunking and index-tagging your document. Please wait...</p>
                        </div>
                      ) : selectedDoc.status === 'failed' ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center text-red-500">
                          <FileText className="size-12 mb-4 text-red-200" />
                          <h4 className="font-semibold text-lg mb-1">Failed to Parse</h4>
                          <p className="text-sm text-neutral-500">Could not extract text. Make sure it is a valid, readable PDF file.</p>
                        </div>
                      ) : (
                        <div className="space-y-4 text-neutral-600 leading-relaxed text-sm">
                          <p className="font-semibold text-neutral-950">Active RAG Grounding Info:</p>
                          <p>This file is fully embedded. The text content has been processed in SQLite and the vector indexes are active inside your local Milvus DB. You can now toggle the workspace chat tab to run queries against this content.</p>
                          
                          <div className="p-4 bg-[#009689]/5 border border-[#009689]/20 rounded-lg text-neutral-700 flex items-center gap-3 mt-4">
                            <CheckCircle2 className="size-5 text-[#009689]" />
                            <span>Successfully indexed under matching chunks tags. Ready for queries.</span>
                          </div>
                          
                          <div className="pt-8 space-y-3">
                            <div className="h-3 bg-neutral-100 rounded w-full" />
                            <div className="h-3 bg-neutral-100 rounded w-11/12" />
                            <div className="h-3 bg-neutral-100 rounded w-4/5" />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-center p-8 text-neutral-500">
                    <div>
                      <FileText className="size-12 mx-auto text-neutral-300 mb-4" />
                      <p className="text-sm max-w-xs mb-4">No active document loaded. Select a document from the Dashboard file list to view its indexing details.</p>
                      <Button onClick={() => setActiveTab('dashboard')}>
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB: WORKSPACE CHAT
              ───────────────────────────────────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="h-full flex overflow-hidden">
              
              {/* Left sidebar inside chat: Active context & sliders */}
              <aside className="w-[28%] shrink-0 bg-[#202020] text-neutral-100 flex p-6 flex-col gap-8 select-none">
                
                {/* Knowledge Base List */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Database className="size-5 text-neutral-100" />
                    <h2 className="font-bold text-white text-base leading-6">
                      Knowledge Base
                    </h2>
                  </div>
                  <div className="flex flex-col max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    {completedDocs.length === 0 ? (
                      <p className="text-xs text-neutral-400 py-4 italic">No documents indexed in vector space.</p>
                    ) : (
                      completedDocs.map((doc, idx) => (
                        <React.Fragment key={doc.id}>
                          {idx > 0 && <div className="bg-white/10 h-px" />}
                          <div className="flex py-3 items-center gap-2">
                            <div className="size-9 shrink-0 rounded-lg bg-white/10 flex justify-center items-center">
                              <FileText className="size-4 text-white" />
                            </div>
                            <div className="min-w-0 flex flex-col flex-1">
                              <span className="font-medium text-white text-sm leading-5 truncate" title={doc.filename}>
                                {doc.filename}
                              </span>
                              <span className="text-white/50 text-xs leading-4">
                                {formatSize(doc.file_size)}
                              </span>
                            </div>
                          </div>
                        </React.Fragment>
                      ))
                    )}
                  </div>
                </div>

                {/* Retrieval Settings Sliders */}
                <div className="flex flex-col gap-4">
                  <span className="font-semibold uppercase text-white/50 text-xs leading-4 tracking-wider">
                    Retrieval Settings
                  </span>
                  
                  {/* Slider 1: Top-K Chunks */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/80">Top-K Chunks</span>
                      <span className="font-semibold text-white">{topK}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={topK}
                      onChange={e => setTopK(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  {/* Slider 2: Similarity Threshold */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/80">Similarity Threshold</span>
                      <span className="font-semibold text-white">{similarityThreshold.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.0" 
                      max="0.95" 
                      step="0.05"
                      value={similarityThreshold}
                      onChange={e => setSimilarityThreshold(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                </div>

                {/* Powered by Sparkles */}
                <div className="flex mt-auto items-center gap-2">
                  <Sparkles className="size-3.5 text-white/40" />
                  <span className="text-white/40 text-xs leading-4">
                    Powered by vector similarity search
                  </span>
                </div>
              </aside>

              {/* Right Side: Chat Panel */}
              <main className="min-w-0 bg-white flex flex-col flex-1 h-full">
                
                {/* Chat Panel Header */}
                <div className="border-neutral-200 border-t-0 border-r-0 border-b border-solid px-8 pt-8 pb-4 shrink-0">
                  <h1 className="font-bold text-2xl leading-8 tracking-tight">
                    Ask Your Documents
                  </h1>
                  <p className="text-neutral-500 text-sm leading-5 mt-1">
                    Questions are answered using only your uploaded content
                  </p>
                </div>

                {/* Scrollable Message stream */}
                <div className="min-h-0 overflow-y-auto flex-1 px-8 py-6 flex flex-col gap-6 custom-scrollbar bg-white">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="size-12 rounded-full bg-neutral-50 flex justify-center items-center mb-4 border border-neutral-200 shadow-sm">
                        <MessageCircle className="size-6 text-neutral-600" />
                      </div>
                      <h3 className="font-bold text-lg text-neutral-900">RAG Chat Session</h3>
                      <p className="text-sm text-neutral-500 max-w-sm mt-2">
                        Type a question below. The search service will query Milvus Lite and formulate an answer using only matching grounded context.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'user' ? (
                          <div className="max-w-[70%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-neutral-900 text-neutral-50 px-4 py-3 shadow-sm text-sm">
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        ) : (
                          <div className="max-w-[78%] rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-neutral-100 text-neutral-900 flex px-4 py-3 flex-col gap-3 shadow-sm text-sm">
                            <p className="leading-relaxed text-neutral-950 whitespace-pre-wrap">{msg.text}</p>
                            
                            {/* Sources display directly integrated inside Bot bubbles */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="border-neutral-200 border-t pt-2 flex flex-col gap-2">
                                {msg.sources
                                  .filter(src => {
                                    const similarity = 1 - src.score;
                                    return similarity >= similarityThreshold;
                                  })
                                  .map((src, sIdx) => (
                                    <div key={sIdx} className="flex items-center gap-1.5 font-mono text-xs text-neutral-700">
                                      <FileText className="size-3.5 text-neutral-900 shrink-0" />
                                      <span className="truncate">
                                        Source: {src.source_file} — Match: {Math.max(0, Math.min(100, Math.round((1 - src.score) * 100)))}%
                                      </span>
                                    </div>
                                  ))
                                }
                                {msg.sources.filter(src => (1 - src.score) >= similarityThreshold).length === 0 && (
                                  <span className="text-xs text-neutral-400 italic font-mono">No sources matched threshold ({similarityThreshold.toFixed(2)})</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[78%] rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-neutral-100 px-4 py-3">
                        <div className="typing-indicator">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  )}

                  {retrievalError && (
                    <>
                      <div className="flex justify-start">
                        <div className="max-w-[82%] w-full">
                          <div className="rounded-xl bg-[#e7000b]/5 border border-[#e7000b]/30 flex p-5 flex-col gap-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="size-9 shrink-0 rounded-full bg-[#e7000b]/10 flex mt-0.5 justify-center items-center text-[#e7000b]">
                                <AlertTriangle className="size-5" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-neutral-950 text-sm leading-5">
                                  {retrievalError.title}
                                </span>
                                <p className="text-neutral-500 text-sm leading-5">
                                  {retrievalError.message}
                                </p>
                              </div>
                            </div>
                            <div className="border-[#e7000b]/20 border-t flex pt-4 flex-col gap-3">
                              <div className="rounded-lg bg-[#e7000b]/5 flex px-3 py-2 items-center gap-2">
                                <Clock className="size-4 shrink-0 text-[#e7000b]" />
                                <span className="font-medium text-[#e7000b] text-xs leading-4">
                                  Error code: {retrievalError.code} — Request exceeded threshold at {retrievalError.time}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Button 
                                  className="font-medium rounded-lg bg-[#e7000b] text-white text-sm leading-5 flex px-4 py-2 items-center gap-2 h-9 hover:bg-[#e7000b]/90"
                                  onClick={() => triggerChat(retrievalError.question)}
                                >
                                  <RotateCcw className="size-4" />
                                  Retry Search
                                </Button>
                                <Button 
                                  className="bg-transparent font-medium rounded-lg text-neutral-950 text-sm leading-5 border-neutral-200 border flex px-4 py-2 items-center gap-2 h-9 hover:bg-neutral-50"
                                  onClick={() => setRetrievalError(null)}
                                >
                                  <Settings className="size-4" />
                                  Adjust Retrieval Settings
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex px-1 items-center gap-2">
                        <div className="bg-neutral-200 flex-1 h-px" />
                        <span className="text-neutral-500 text-xs leading-4 px-2">
                          Waiting for retry or new query
                        </span>
                        <div className="bg-neutral-200 flex-1 h-px" />
                      </div>
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input form */}
                <div className="border-neutral-200 border-t border-solid flex px-8 py-4 flex-col gap-2 shrink-0 bg-white">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <div className={`rounded-full bg-white border border-neutral-200 flex px-4 items-center flex-1 gap-2 h-12 shadow-sm focus-within:border-neutral-400 transition-colors ${retrievalError ? 'opacity-60 pointer-events-none' : ''}`}>
                      <Search className="size-4 text-neutral-500" />
                      <input
                        className="bg-transparent outline-none text-sm leading-5 flex-1"
                        placeholder={retrievalError ? "Service unavailable" : (completedDocs.length === 0 ? "Upload documents first to start chatting..." : "Ask a question about your documents…")}
                        type="text"
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        disabled={chatLoading || completedDocs.length === 0 || !!retrievalError}
                      />
                      {retrievalError && (
                        <div className="shrink-0 flex items-center gap-1.5">
                          <AlertCircle className="size-4 text-[#e7000b]" />
                          <span className="font-medium text-[#e7000b] text-xs leading-4">
                            Service unavailable
                          </span>
                        </div>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className={`size-12 shrink-0 rounded-full bg-neutral-900 text-neutral-50 flex p-0 justify-center items-center hover:bg-neutral-900/90 active:scale-95 transition-transform ${retrievalError ? 'opacity-50 pointer-events-none bg-neutral-100 text-neutral-500' : ''}`}
                      disabled={!inputMessage.trim() || chatLoading || completedDocs.length === 0 || !!retrievalError}
                    >
                      <Send className="size-5" />
                    </Button>
                  </form>
                  {retrievalError ? (
                    <div className="flex justify-center items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-[#e7000b]" />
                      <span className="font-medium text-[#e7000b] text-xs leading-4">
                        Vector search is temporarily unavailable — please retry or check your connection
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-center items-center gap-1.5 text-neutral-500">
                      <ShieldCheck className="size-3.5 text-neutral-500" />
                      <span className="text-neutral-500 text-xs leading-4">
                        Answers are grounded in your uploaded documents only
                      </span>
                    </div>
                  )}
                </div>

              </main>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB: SETTINGS
              ───────────────────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="p-8 max-w-2xl mx-auto space-y-6">
              <h1 className="font-bold text-2xl text-neutral-900 tracking-tight">RAG Pipeline settings</h1>
              
              <Card className="border-neutral-100 shadow-sm p-6">
                <CardContent className="p-0 space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm leading-5">Google Gemini API configuration</h3>
                    <p className="text-xs text-neutral-500 mt-1">Status: Active</p>
                  </div>
                  <div className="pt-4 border-t border-neutral-100">
                    <h3 className="font-semibold text-sm leading-5">Local SQLite Database configuration</h3>
                    <p className="text-xs text-neutral-500 mt-1">Location: ./user_documents.db</p>
                  </div>
                  <div className="pt-4 border-t border-neutral-100">
                    <h3 className="font-semibold text-sm leading-5">Vector DB connection</h3>
                    <p className="text-xs text-neutral-500 mt-1">Status: Milvus-Lite active on ./milvus_local.db</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
