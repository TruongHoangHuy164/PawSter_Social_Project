import React, { useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

export default function Upgrade(){
  const { user, token, setUser } = useAuth();
  const [creating, setCreating] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [status, setStatus] = useState('');

  const createPayment = async ()=>{
    setCreating(true); setStatus('');
    try {
      const res = await api.post('/payments/create', {}, token);
      setPaymentId(res.data.data.paymentId);
      setStatus('Tạo order thành công. Fake webhook để kích hoạt.');
    } catch(e){ setStatus(e.message);} finally { setCreating(false);} 
  };

  const fakeWebhook = async ()=>{
    if (!paymentId) return;
    try {
      await api.post('/payments/webhook', { paymentId, status:'paid' });
      setUser({...user, isPro:true});
      setStatus('Đã nâng cấp Pro!');
    } catch(e){ setStatus(e.message);} 
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-lg font-semibold">Nâng cấp Pro</h1>
      <div className="card p-5 rounded space-y-4">
        <p className="text-sm leading-relaxed" style={{color:'var(--text)'}}>Tài khoản Pro giúp bạn tăng giới hạn bạn bè lên 200 và có huy hiệu PRO nổi bật.</p>
        <div className="flex gap-3">
          <button disabled={creating || user?.isPro} onClick={createPayment} className="px-5 py-2 rounded bg-gradient-to-r from-violet-600 to-violet-500 disabled:opacity-50 text-sm font-medium text-white">Tạo payment</button>
          <button disabled={!paymentId || user?.isPro} onClick={fakeWebhook} className="px-5 py-2 rounded bg-gradient-to-r from-emerald-600 to-emerald-500 disabled:opacity-50 text-sm font-medium text-white">Fake webhook (paid)</button>
        </div>
        {paymentId && <div className="text-xs text-neutral-400">Payment ID: {paymentId}</div>}
        {status && <div className="text-xs text-violet-400">{status}</div>}
        {user?.isPro && <div className="text-sm text-emerald-400">Bạn đã là Pro!</div>}
      </div>
    </div>
  );
}
