import React, { useState, useEffect } from 'react';
import { api } from './api/client';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WorkspaceChat from './components/WorkspaceChat';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const [topK, setTopK] = useState(3);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.20);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [retrievalError, setRetrievalError] = useState(null);
  
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    let intervalId;
    const hasProcessingDocs = documents.some(d => d.status === 'processing');
    
    if (hasProcessingDocs) {
      intervalId = setInterval(() => {
        fetchDocuments();
      }, 2000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      const data = await api.fetchDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
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

    setUploading(true);
    setUploadError('');

    try {
      await api.uploadDocument(file);
      setUploading(false);
      fetchDocuments();
    } catch (err) {
      setUploadError(err.message);
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (e, id) => {
    e.stopPropagation();
    try {
      await api.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const triggerChat = async (questionToAsk) => {
    setChatLoading(true);
    setRetrievalError(null);
    try {
      const data = await api.chat(questionToAsk, topK, similarityThreshold);
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
              uploadError={uploadError}
              setUploadError={setUploadError}
              handleFileUpload={handleFileUpload}
              handleDeleteDocument={handleDeleteDocument}
              setActiveTab={setActiveTab}
              dragActive={dragActive}
              setDragActive={setDragActive}
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
        </main>
      </div>
    </div>
  );
}

export default App;
