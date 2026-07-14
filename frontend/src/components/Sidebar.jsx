import React from 'react';
import { LayoutDashboard, MessageCircle, History } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, setMessages, setRetrievalError }) {
  return (
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
      </div>
    </aside>
  );
}
