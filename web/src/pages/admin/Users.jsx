import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

export default function Users(){
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const load = async()=>{
    try{ const res = await api.get('/admin/users', token); setItems(res.data.data);}catch(e){ setErr(e.message);} 
  };
  useEffect(()=>{ load(); }, [token]);
  const update = async(id, patch)=>{
    try{ await api.patch(`/admin/users/${id}`, patch, token); await load(); }catch(e){ alert(e.message); }
  };
  return (
    <div className="card p-4 overflow-auto">
      {err && <div className="text-red-500 mb-2">{err}</div>}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">User</th>
            <th className="p-2">Email</th>
            <th className="p-2">Pro</th>
            <th className="p-2">Admin</th>
            <th className="p-2">Badges</th>
            <th className="p-2">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {items.map(u=> (
            <tr key={u._id} className="border-t border-[var(--panel-border)]">
              <td className="p-2">{u.username}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2"><input type="checkbox" checked={!!u.isPro} onChange={e=>update(u._id, { isPro: e.target.checked })} /></td>
              <td className="p-2"><input type="checkbox" checked={!!u.isAdmin} onChange={e=>update(u._id, { isAdmin: e.target.checked })} /></td>
              <td className="p-2">{(u.badges||[]).join(', ')}</td>
              <td className="p-2 space-x-2">
                <button className="px-2 py-1 text-xs rounded" style={{background:'var(--panel-border)'}} onClick={()=>{
                  const val = prompt('Nhập badges, phân tách bởi dấu phẩy', (u.badges||[]).join(','));
                  if (val!=null) update(u._id, { badges: val.split(',').map(s=>s.trim()).filter(Boolean) });
                }}>Sửa badges</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
