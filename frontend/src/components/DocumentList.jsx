import React from 'react';
import { FileText, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { formatSize } from '../utils';

export default function DocumentList({ activeTab, setActiveTab, selectedDoc }) {
  return (
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
  );
}
