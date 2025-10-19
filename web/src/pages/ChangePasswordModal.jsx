import React, { useState } from 'react';
import { useAuth } from '../state/auth.jsx';
import { authApi } from '../utils/api.js';

export default function ChangePasswordModal({ open, onClose }) {
  const { token } = useAuth();
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!open) return null;

  const doRequestOtp = async () => {
    setLoading(true); setMessage(null); setError(null);
    try {
      await authApi.requestPasswordOtp(token);
      setMessage('Đã gửi OTP tới email của bạn.');
      setStep('verify');
    } catch (e) {
      setError(e?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  const doChangePassword = async (e) => {
    e?.preventDefault();
    if (!otp || !newPassword) { setError('Vui lòng nhập đầy đủ OTP và mật khẩu mới'); return; }
    setLoading(true); setMessage(null); setError(null);
    try {
      await authApi.changePasswordWithOtp({ otp, newPassword }, token);
      setMessage('Đổi mật khẩu thành công.');
      setTimeout(() => onClose?.(), 800);
    } catch (e) {
      setError(e?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl shadow-lg p-4" style={{background:'var(--panel)', border:'1px solid var(--panel-border)'}}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Đổi mật khẩu (OTP)</h3>
          <button onClick={onClose} className="text-sm px-2 py-1 border rounded">Đóng</button>
        </div>
        {message && <div className="text-xs text-green-600 mb-2">{message}</div>}
        {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
        {step === 'request' && (
          <div className="space-y-3">
            <p className="text-sm">Gửi mã OTP đến email của bạn để đổi mật khẩu.</p>
            <button onClick={doRequestOtp} disabled={loading} className="w-full text-sm px-3 py-2 rounded bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-60">
              {loading ? 'Đang gửi...' : 'Gửi OTP'}
            </button>
          </div>
        )}
        {step === 'verify' && (
          <form onSubmit={doChangePassword} className="space-y-3">
            <div>
              <label className="text-xs">Mã OTP</label>
              <input value={otp} onChange={e=>setOtp(e.target.value)} className="w-full mt-1 px-3 py-2 rounded border" placeholder="Nhập 6 số" />
            </div>
            <div>
              <label className="text-xs">Mật khẩu mới</label>
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full mt-1 px-3 py-2 rounded border" placeholder="••••••••" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="flex-1 text-sm px-3 py-2 rounded bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-60">
                {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </button>
              <button type="button" onClick={()=>setStep('request')} className="px-3 py-2 text-sm border rounded">Gửi lại OTP</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}