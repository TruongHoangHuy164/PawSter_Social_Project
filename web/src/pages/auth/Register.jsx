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
      <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Tạo tài khoản mới</h1>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input className="w-full px-3 py-2 rounded-xl bg-transparent border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30 text-black dark:text-white" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" className="w-full px-3 py-2 rounded-xl bg-transparent border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30 text-black dark:text-white" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Mật khẩu</label>
            <input type="password" className="w-full px-3 py-2 rounded-xl bg-transparent border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30 text-black dark:text-white" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required />
          </div>
          <button disabled={loading} className="w-full py-2 rounded-2xl bg-black text-white dark:bg-white dark:text-black">{loading? 'Đang xử lý...' : 'Tạo tài khoản'}</button>
          <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">Đã có tài khoản? <Link to="/login" className="underline-offset-4 hover:underline">Đăng nhập</Link></p>
        </form>
      </div>
    </div>
  );
}
