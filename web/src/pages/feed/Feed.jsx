import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';
import ThreadComposer from '../../ui/ThreadComposer.jsx';
import ThreadItem from '../../ui/ThreadItem.jsx';

export default function Feed(){
  const { token } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async ()=>{
    setLoading(true);
    try {
      const res = await api.get('/threads', token);
      setThreads(res.data.data);
    } catch(e){ console.error(e);} finally { setLoading(false);} 
  }, [token]);

  useEffect(()=>{ load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <ThreadComposer onCreated={(t)=>setThreads(ts=>[t, ...ts])} />
      {loading && <div className="text-center text-sm text-neutral-500">Đang tải...</div>}
      {!loading && threads.length===0 && <div className="text-center text-sm text-neutral-500">Chưa có bài viết.</div>}
      <div className="space-y-4">
        {threads.map(t=> <ThreadItem key={t._id} thread={t} onDelete={(id)=>setThreads(ts=>ts.filter(x=>x._id!==id))} />)}
      </div>
    </div>
  );
}
