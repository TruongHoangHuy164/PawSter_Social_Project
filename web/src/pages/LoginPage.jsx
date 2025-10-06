import React, { useState } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../state/auth.jsx';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage(){
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e)=>{
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.data.token);
      nav('/');
    } catch (e){ setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-6 rounded-lg space-y-5 shadow-xl">
        <h1 className="text-xl font-semibold text-center">Đăng nhập</h1>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <div className="space-y-2">
          <label className="text-sm">Email</label>
          <input type="email" className="w-full bg-neutral-800 border-neutral-700 focus:ring-violet-500 focus:border-violet-500 rounded" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Mật khẩu</label>
            <input type="password" className="w-full bg-neutral-800 border-neutral-700 focus:ring-violet-500 focus:border-violet-500 rounded" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required />
        </div>
        <button disabled={loading} className="w-full py-2 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 font-medium">{loading? 'Đang xử lý...' : 'Đăng nhập'}</button>
        <p className="text-xs text-center text-neutral-400">Chưa có tài khoản? <Link to="/register" className="text-violet-400 hover:underline">Đăng ký</Link></p>
      </form>
    </div>
  );
}
