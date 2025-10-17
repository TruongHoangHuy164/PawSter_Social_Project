import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

export default function Dashboard(){
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');
  useEffect(()=>{
    (async()=>{
      try{ const res = await api.get('/admin/stats', token); setStats(res.data.data);}catch(e){ setErr(e.message);} 
    })();
  },[token]);
  if (err) return <div className="card p-4 text-red-500">{err}</div>;
  if (!stats) return <div className="card p-4">Đang tải...</div>;
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card p-4"><div className="text-sm text-black font-semibold">Người dùng</div><div className="text-3xl font-extrabold">{stats.users}</div></div>
      <div className="card p-4"><div className="text-sm text-black font-semibold">Bài viết</div><div className="text-3xl font-extrabold">{stats.threads}</div></div>
      <div className="card p-4"><div className="text-sm text-black font-semibold">Thanh toán (paid/pending)</div><div className="text-3xl font-extrabold">{stats.payments.paid}/{stats.payments.pending}</div></div>
    </div>
  );
}
