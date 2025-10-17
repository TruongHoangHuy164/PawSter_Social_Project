import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

export default function Threads(){
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const load = async()=>{
    try{ const res = await api.get('/admin/threads', token); setItems(res.data.data);}catch(e){ setErr(e.message);} 
  };
  useEffect(()=>{ load(); }, [token]);
  const del = async(id)=>{
    if (!confirm('Xóa bài viết này?')) return;
    try{ await api.del(`/admin/threads/${id}`, token); await load(); }catch(e){ alert(e.message); }
  };
  return (
    <div className="card p-4 overflow-auto">
      {err && <div className="text-red-500 mb-2">{err}</div>}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2 text-black font-semibold">Tác giả</th>
            <th className="p-2 text-black font-semibold">Nội dung</th>
            <th className="p-2 text-black font-semibold">Media</th>
            <th className="p-2 text-black font-semibold">Thời gian</th>
            <th className="p-2 text-black font-semibold">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {items.map(t=> (
            <tr key={t._id} className="border-t border-[var(--panel-border)]">
              <td className="p-2">{t.author?.username || '—'}</td>
              <td className="p-2 max-w-[360px] truncate">{t.content}</td>
              <td className="p-2">{t.media?.length||0}</td>
              <td className="p-2 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
              <td className="p-2"><button onClick={()=>del(t._id)} className="px-2 py-1 text-xs rounded bg-[color:var(--accent)]/95 text-white">Xóa</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
