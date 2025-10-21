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
    <div className="w-full mx-auto p-4 space-y-6 paw-bg">
      <div className="lux-card p-5 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-extrabold tracking-tight text-black dark:text-white">Bảng tin</h2>
          <span className="pill text-xs flex items-center gap-2 text-[color:var(--muted)]">
            <span className="paw-icon" /> Pawster Today
          </span>
        </div>
        <ThreadComposer onCreated={(t)=>setThreads(ts=>[t, ...ts])} />
      </div>
      {loading && <div className="text-center text-sm text-neutral-500">Đang tải...</div>}
      {!loading && threads.length===0 && (
        <div className="lux-card rounded-xl p-6 text-center text-sm text-neutral-500">
          <div className="mb-2 text-base font-semibold text-black dark:text-white">Chưa có bài viết</div>
          Hãy là người đầu tiên chia sẻ khoảnh khắc cùng thú cưng của bạn.
        </div>
      )}
      <div className="space-y-4">
        {threads.map(t=> <div key={t._id} className="fade-in"><ThreadItem thread={t} onDelete={(id)=>setThreads(ts=>ts.filter(x=>x._id!==id))} /></div>)}
      </div>
    </div>
  );
}
