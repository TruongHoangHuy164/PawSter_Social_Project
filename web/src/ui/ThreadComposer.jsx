import React, { useState } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../state/auth.jsx';

export default function ThreadComposer({ onCreated }){
  const { token } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e)=>{
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/threads', { content: text.trim() }, token);
      setText('');
      onCreated?.(res.data.data);
    } catch (e){
      console.error(e);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="border border-neutral-800 rounded-lg p-4 bg-neutral-900 space-y-3">
      <textarea value={text} onChange={e=>setText(e.target.value)} maxLength={500} rows={3} placeholder="Bạn đang nghĩ gì?" className="w-full resize-none bg-neutral-800 border-neutral-700 focus:ring-violet-500 focus:border-violet-500 rounded" />
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{text.length}/500</span>
        <button disabled={loading || !text.trim()} className="px-4 py-1.5 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-40 font-medium text-sm">Đăng</button>
      </div>
    </form>
  );
}
