import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

export default function Payments(){
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  useEffect(()=>{
    (async()=>{
      try{ const res = await api.get('/admin/payments', token); setItems(res.data.data);}catch(e){ setErr(e.message);} 
    })();
  }, [token]);
  return (
    <div className="card p-4 overflow-auto">
      {err && <div className="text-red-500 mb-2">{err}</div>}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">Người dùng</th>
            <th className="p-2">Provider</th>
            <th className="p-2">Số tiền</th>
            <th className="p-2">Trạng thái</th>
            <th className="p-2">Thời gian</th>
          </tr>
        </thead>
        <tbody>
          {items.map(p=> (
            <tr key={p._id} className="border-t border-[var(--panel-border)]">
              <td className="p-2">{p.user?.username || '—'}</td>
              <td className="p-2">{p.provider}</td>
              <td className="p-2">{p.amount}</td>
              <td className="p-2">{p.status}</td>
              <td className="p-2 whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
