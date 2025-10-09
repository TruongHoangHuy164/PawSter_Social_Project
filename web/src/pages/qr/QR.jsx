import React, { useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

export default function QR(){
  const { token } = useAuth();
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tokenInput, setTokenInput] = useState('');

  const createQR = async ()=>{
    setLoading(true); setMessage('');
    try {
      const res = await api.post('/qr/create', {}, token);
      setQr(res.data.data);
    } catch(e){ setMessage(e.message);} finally { setLoading(false);} 
  };

  const sendRequest = async ()=>{
    if (!tokenInput.trim()) return;
    setLoading(true); setMessage('');
    try {
      const res = await api.post('/qr/scan', { token: tokenInput.trim() }, token);
      setMessage(res.data.message || 'Đã gửi yêu cầu');
    } catch(e){ setMessage(e.message);} finally { setLoading(false);} 
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-lg font-semibold">Kết bạn qua QR</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4 card p-5 rounded">
          <h2 className="font-medium">Tạo mã QR của bạn</h2>
          <button onClick={createQR} disabled={loading} className="px-4 py-2 rounded bg-gradient-to-r from-violet-600 to-violet-500 disabled:opacity-50 text-sm font-medium text-white">{loading? 'Đang tạo...' : 'Tạo QR'}</button>
          {qr && (
            <div className="space-y-2 text-center">
              <img src={qr.qr} alt="qr" className="mx-auto w-48 h-48 rounded bg-white p-2" />
              <div className="text-[10px] break-all text-neutral-400">Token: {qr.token}</div>
              <div className="text-xs text-neutral-400">Hết hạn: {new Date(qr.expiresAt).toLocaleTimeString()}</div>
            </div>
          )}
        </div>
        <div className="space-y-4 card p-5 rounded">
          <h2 className="font-medium">Nhập token bạn bè</h2>
          <textarea rows={4} value={tokenInput} onChange={e=>setTokenInput(e.target.value)} placeholder="Dán token QR..." className="w-full bg-white border border-neutral-200 focus:ring-2 focus:ring-[color:var(--accent)] rounded p-2" />
          <button onClick={sendRequest} disabled={loading || !tokenInput.trim()} className="px-4 py-2 rounded bg-gradient-to-r from-emerald-600 to-emerald-500 disabled:opacity-50 text-sm font-medium text-white">Gửi yêu cầu</button>
          {message && <div className="text-xs text-violet-400">{message}</div>}
        </div>
      </div>
    </div>
  );
}
