import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';
import ThreadItem from '../../ui/ThreadItem.jsx';

export default function TagFeed(){
  const { token } = useAuth();
  const { tag } = useParams();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ()=>{
    if (!tag) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/threads/tag/${encodeURIComponent(tag)}`, token);
      setThreads(res.data.data || []);
    } catch(e){
      console.error(e);
      setError(e.message || 'Lỗi tải hashtag');
    } finally { setLoading(false); }
  }, [token, tag]);

  useEffect(()=>{ load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold"># {tag}</h1>
        <p className="text-sm text-neutral-500">Các bài viết với hashtag này</p>
      </div>
      {loading && <div className="text-center text-sm text-neutral-500">Đang tải...</div>}
      {error && <div className="text-center text-sm text-red-500">{error}</div>}
      {!loading && !error && threads.length===0 && <div className="text-center text-sm text-neutral-500">Chưa có bài viết.</div>}
      <div className="space-y-4">
        {threads.map(t=> (
          <div key={t._id} className="fade-in">
            <ThreadItem thread={t} />
          </div>
        ))}
      </div>
    </div>
  );
}
