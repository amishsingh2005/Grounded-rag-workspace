import React from 'react';
import { Boxes } from 'lucide-react';
import { Button } from './ui/button';

export default function AuthView({ authMode, setAuthMode, email, setEmail, password, setPassword, authError, setAuthError, handleAuthSubmit }) {
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
