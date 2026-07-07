import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { Card, CardContent } from './components/ui/card';
import { api } from './api/client';

import AuthView from './components/AuthView';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DocumentList from './components/DocumentList';
import WorkspaceChat from './components/WorkspaceChat';

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState(null);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  const [topK, setTopK] = useState(3);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.20);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [retrievalError, setRetrievalError] = useState(null);
  
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.fetchUser(token).then(data => {
        setUser(data);
        fetchDocuments(token);
      }).catch(err => {
        console.error('Auto-login failed', err);
        localStorage.removeItem('token');
      });
    }
  }, []);

  useEffect(() => {
    let intervalId;
    const hasProcessingDocs = documents.some(d => d.status === 'processing');
    
    if (user && hasProcessingDocs) {
      intervalId = setInterval(() => {
        fetchDocuments(localStorage.getItem('token'));
      }, 2000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, documents]);

  const fetchDocuments = async (token) => {
    try {
      const data = await api.fetchDocuments(token);
      setDocuments(data);
      if (selectedDoc) {
        const updated = data.find(d => d.id === selectedDoc.id);
        if (updated) setSelectedDoc(updated);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'register') {
        const data = await api.register(email, password);
        setAuthMode('login');
        setAuthError('Registration successful. Please log in.');
      } else {
        const data = await api.login(email, password);
        localStorage.setItem('token', data.access_token);
        const userData = await api.fetchUser(data.access_token);
        setUser(userData);
        fetchDocuments(data.access_token);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setDocuments([]);
    setMessages([]);
    setRetrievalError(null);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File exceeds 50MB limit.');
      return;
    }

    const token = localStorage.getItem('token');
    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

      await api.uploadDocument(token, file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
      
      fetchDocuments(token);
    } catch (err) {
      setUploadError(err.message);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (e, id) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await api.deleteDocument(token, id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selectedDoc && selectedDoc.id === id) {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const triggerChat = async (questionToAsk) => {
    setChatLoading(true);
    setRetrievalError(null);
    try {
      const token = localStorage.getItem('token');
      const data = await api.chat(token, questionToAsk, topK, similarityThreshold);
      setMessages(prev => [...prev, { sender: 'bot', text: data.answer, sources: data.sources }]);
    } catch (err) {
      console.error(err);
      setRetrievalError({
        title: "Search Service Disconnected",
        message: err.message || "Failed to retrieve from vector database. Please ensure Milvus is running and try again.",
        code: "VECTOR_DB_UNAVAILABLE",
        time: new Date().toLocaleTimeString(),
        question: questionToAsk
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;
    
    const question = inputMessage.trim();
    setMessages(prev => [...prev, { sender: 'user', text: question }]);
    setInputMessage('');
    triggerChat(question);
  };

  useEffect(() => {
    if (activeTab === 'documents' && documents.length > 0 && !selectedDoc) {
      setSelectedDoc(documents[0]);
    }
  }, [activeTab, documents, selectedDoc]);

  if (!user) {
    return (
      <AuthView 
        authMode={authMode} setAuthMode={setAuthMode}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        authError={authError} setAuthError={setAuthError}
        handleAuthSubmit={handleAuthSubmit}
      />
    );
  }

  const completedDocs = documents.filter(d => d.status === 'completed');

  return (
    <div className="h-screen w-screen bg-background flex flex-col font-sans text-foreground overflow-hidden">
      
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-neutral-200 flex px-6 items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 flex justify-center items-center">
            <span className="font-bold text-white text-lg leading-7">D</span>
          </div>
          <h1 className="font-bold text-xl leading-7 tracking-tight">DocuIntel AI</h1>
          <div className="rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 ml-2">
            <span className="font-medium text-neutral-600 text-xs">Enterprise Workspace</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-2 h-2 rounded-full bg-[#009689] animate-pulse shadow-sm shadow-[#009689]/50" />
            <span className="text-xs font-medium text-neutral-500">System Online</span>
          </div>
          <div className="h-4 w-px bg-neutral-200" />
          <span className="text-sm font-medium text-neutral-700">{user.email}</span>
          <button 
            onClick={handleLogout}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          setMessages={setMessages} 
          setRetrievalError={setRetrievalError} 
        />
        
        <main className="flex-1 min-w-0 bg-neutral-50 flex flex-col relative h-full">
          {activeTab === 'dashboard' && (
            <Dashboard 
              documents={documents}
              uploading={uploading}
              uploadProgress={uploadProgress}
              uploadError={uploadError}
              setUploadError={setUploadError}
              handleFileUpload={handleFileUpload}
              handleDeleteDocument={handleDeleteDocument}
              setActiveTab={setActiveTab}
              dragActive={dragActive}
              setDragActive={setDragActive}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentList 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedDoc={selectedDoc}
            />
          )}

          {activeTab === 'chat' && (
            <WorkspaceChat 
              completedDocs={completedDocs}
              topK={topK}
              setTopK={setTopK}
              similarityThreshold={similarityThreshold}
              setSimilarityThreshold={setSimilarityThreshold}
              messages={messages}
              chatLoading={chatLoading}
              retrievalError={retrievalError}
              setRetrievalError={setRetrievalError}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              handleSendMessage={handleSendMessage}
              triggerChat={triggerChat}
            />
          )}

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

export default App;
