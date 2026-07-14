import React, { useEffect, useRef } from 'react';
import { Database, FileText, Sparkles, MessageCircle, AlertTriangle, Clock, RotateCcw, Settings, Search, AlertCircle, Send, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { formatSize } from '../utils';

export default function WorkspaceChat({
  completedDocs,
  topK,
  setTopK,
  similarityThreshold,
  setSimilarityThreshold,
  messages,
  chatLoading,
  retrievalError,
  setRetrievalError,
  inputMessage,
  setInputMessage,
  handleSendMessage,
  triggerChat
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading, retrievalError]);

  return (
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
                    <p className="leading-relaxed text-neutral-950 whitespace-pre-wrap">
                      {msg.text}
                      {msg.streaming && <span className="streaming-cursor" />}
                    </p>
                    
                    {/* Sources display directly integrated inside Bot bubbles */}
                    {msg.sources && msg.sources.length > 0 && !msg.streaming && (
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

          {chatLoading && !messages.some(m => m.streaming) && (
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
  );
}
