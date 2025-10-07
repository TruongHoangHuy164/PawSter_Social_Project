import React, { useState } from 'react';
import { useAuth } from '../../state/auth.jsx';
import { api } from '../../utils/api.js';

export default function Profile(){
  const { user, setUser, token } = useAuth();
  const [username, setUsername] = useState(user?.username||'');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async ()=>{
    setSaving(true); setMsg('');
    try {
      const res = await api.patch('/users/me', { username }, token);
      setUser(res.data.data);
      setMsg('Đã lưu');
    } catch(e){ setMsg(e.message); } finally { setSaving(false); }
  };

  if (!user) return null;
  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-lg font-semibold">Hồ sơ cá nhân</h1>
      <div className="space-y-4 bg-neutral-900 border border-neutral-800 p-5 rounded-lg">
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">Username</label>
          <input className="w-full bg-neutral-800 border-neutral-700 focus:ring-violet-500 focus:border-violet-500 rounded" value={username} onChange={e=>setUsername(e.target.value)} />
        </div>
        <div className="text-sm text-neutral-400">Email: {user.email}</div>
        <div className="text-sm text-neutral-400">Pro: {user.isPro ? 'Yes' : 'No'}</div>
        <button disabled={saving} onClick={save} className="px-5 py-2 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 font-medium">{saving?'Đang lưu...':'Lưu'}</button>
        {msg && <div className="text-xs text-violet-400">{msg}</div>}
      </div>
    </div>
  );
}
