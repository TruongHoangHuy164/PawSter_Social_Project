import React, { useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';
import { Link, useNavigate } from 'react-router-dom';

export default function Register(){
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e)=>{
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.data.token);
      nav('/');
    } catch (e){ setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md card p-6 rounded-xl">
        <h1 className="text-2xl font-bold mb-4">Tạo tài khoản mới</h1>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input className="w-full px-3 py-2 rounded bg-white border border-neutral-200 focus:ring-2 focus:ring-[color:var(--accent)] transition" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" className="w-full px-3 py-2 rounded bg-white border border-neutral-200 focus:ring-2 focus:ring-[color:var(--accent)] transition" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Mật khẩu</label>
            <input type="password" className="w-full px-3 py-2 rounded bg-white border border-neutral-200 focus:ring-2 focus:ring-[color:var(--accent)] transition" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required />
          </div>
          <button disabled={loading} className="w-full py-2 rounded-md bg-gradient-to-r from-violet-600 to-violet-500 text-white">{loading? 'Đang xử lý...' : 'Tạo tài khoản'}</button>
          <p className="text-xs text-center text-neutral-400">Đã có tài khoản? <Link to="/login" className="text-violet-400 hover:underline">Đăng nhập</Link></p>
        </form>
      </div>
    </div>
  );
}
