import React from 'react';
import ProBadge from './ProBadge.jsx';
import { api } from '../utils/api.js';
import { useAuth } from '../state/auth.jsx';

export default function ThreadItem({ thread, onDelete }){
  const { user, token } = useAuth();
  const mine = user && thread.author && thread.author._id === user._id;
  const del = async ()=>{
    if (!confirm('Xóa bài này?')) return;
    try { await api.del(`/threads/${thread._id}`, token); onDelete?.(thread._id); } catch(e){ console.error(e); }
  };
  return (
    <div className="p-4 border border-neutral-800 rounded-lg bg-neutral-900 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{thread.author?.username || 'Unknown'} {thread.author?.isPro && <ProBadge />}</span>
        <span className="text-neutral-500 text-xs">{new Date(thread.createdAt).toLocaleString()}</span>
        {mine && <button onClick={del} className="ml-auto text-xs text-red-400 hover:underline">Xóa</button>}
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{thread.content}</div>
    </div>
  );
}
