import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';
import { Link, useNavigate } from 'react-router-dom';

export default function Login(){
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  // Initialize Google Identity Services
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1040653556867-hnjvrtkm0ts74fihu4h75irp839578tq.apps.googleusercontent.com';
    if (!clientId) return; // don't init if not configured

    const init = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp) => {
            const idToken = resp?.credential;
            if (!idToken) return;
            try {
              const res = await api.post('/auth/google', { idToken });
              const { token, user } = res.data.data || {};
              login(token);
              const isAdmin = !!(user && user.isAdmin);
              nav(isAdmin ? '/admin' : '/');
            } catch (e) {
              setError(e.message || 'Đăng nhập Google thất bại');
            }
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 320,
        });
      }
    };

    // inject script if not present
    const id = 'google-identity-script';
    const existing = document.getElementById(id);
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.id = id;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      init();
    }

  }, [login, nav]);

  const submit = async (e)=>{
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = { email: (form.email || '').trim().toLowerCase(), password: form.password };
      const res = await api.post('/auth/login', payload);
      const { token, user } = res.data.data || {};
      login(token);
      const isAdmin = !!(user && user.isAdmin);
      nav(isAdmin ? '/admin' : '/');
    } catch (e){ setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-transparent to-transparent">
      <div className="w-full max-w-md p-6 rounded-xl card">
        <div className="flex items-center gap-4 mb-4">
          <img src="/logo.png" alt="logo" className="w-12 h-12 rounded-md shadow" />
          <div>
            <h1 className="text-2xl font-bold" style={{color:'var(--text)'}}>Chào mừng đến với Pawster</h1>
            <p className="text-sm text-muted-foreground">Đăng nhập để tiếp tục</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 fade-in">
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" className="w-full px-3 py-2 rounded-md bg-white border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Mật khẩu</label>
            <input type="password" className="w-full px-3 py-2 rounded-md bg-white border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required />
          </div>
          <button disabled={loading} className="w-full py-2 rounded-md bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md hover:scale-[1.01] transform-gpu transition">{loading? 'Đang xử lý...' : 'Đăng nhập'}</button>
          <p className="text-xs text-center text-neutral-400">Chưa có tài khoản? <Link to="/register" className="text-violet-400 hover:underline">Đăng ký</Link></p>
        </form>
        <div className="relative my-4">
          <div className="h-px bg-black/10 dark:bg-white/10" />
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 px-3 text-xs bg-[color:var(--panel)]">Hoặc</div>
        </div>
        <div ref={googleBtnRef} className="flex justify-center" />
      </div>
    </div>
  );
}
