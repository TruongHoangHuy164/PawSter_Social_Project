import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/auth.jsx';
import { api } from '../../utils/api.js';

function useQuery(){
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function PaymentReturn(){
  const q = useQuery();
  const { token, user, setUser } = useAuth();
  const [message, setMessage] = useState('Đang kiểm tra thanh toán...');
  const [status, setStatus] = useState('loading'); // loading | success | failed | pending
  const resultCode = q.get('resultCode');
  const orderId = q.get('orderId');
  const momoMessage = q.get('message');
  const location = useLocation();
  const navigate = useNavigate();

  const refreshMe = useCallback(async ()=>{
    if (!token) throw new Error('Chưa đăng nhập');
    const res = await api.get('/users/me', token);
    setUser(res.data.data);
    return res.data.data;
  }, [token, setUser]);

  useEffect(()=>{
    let alive = true;
    (async()=>{
      try {
        // Nếu MoMo báo resultCode=0, hiển thị trạng thái tạm thời “đang xử lý” trong khi chờ IPN
        if (resultCode === '0' || resultCode === 0) {
          setStatus('pending');
          setMessage('Thanh toán thành công trên MoMo. Đang chờ xác nhận từ hệ thống (IPN)...');
        } else if (resultCode != null) {
          setStatus('failed');
          setMessage(momoMessage || 'Thanh toán thất bại hoặc bị huỷ.');
        }

        // Poll /users/me tối đa 5 lần để chờ IPN cập nhật
        for (let i=0; i<5; i++) {
          await new Promise(r=>setTimeout(r, 1200));
          const me = await refreshMe().catch(()=>null);
          if (!alive) return;
          if (me?.isPro) {
            setStatus('success');
            setMessage('Thanh toán thành công! Tài khoản của bạn đã được nâng cấp Pro.');
            return;
          }
        }
        // Nếu vẫn chưa có IPN nhưng MoMo báo success, thử gọi endpoint confirm để xác nhận dựa trên payload redirect
        if (resultCode === '0' || resultCode === 0) {
          try {
            const searchParams = new URLSearchParams(location.search);
            const payload = {};
            for (const [k,v] of searchParams.entries()) payload[k] = v;
            await api.post('/payments/momo/confirm', payload);
            const me = await refreshMe();
            if (me?.isPro) {
              setStatus('success');
              setMessage('Thanh toán thành công! Tài khoản của bạn đã được nâng cấp Pro.');
              return;
            }
          } catch (e) {
            // ignore, fallback to pending
          }
          setStatus('pending');
          setMessage('Thanh toán đã được ghi nhận. Hệ thống đang xử lý, vui lòng đợi thêm hoặc thử làm mới.');
        } else {
          setStatus('failed');
          setMessage(momoMessage || 'Không xác nhận được thanh toán.');
        }
      } catch(e){
        if (!alive) return;
        setStatus('failed');
        setMessage(e.message || 'Lỗi khi xác nhận thanh toán.');
      }
    })();
    return ()=>{ alive = false; };
  }, [resultCode, momoMessage, refreshMe, location.search]);

  const icon = status==='success' ? '✅' : status==='failed' ? '⚠️' : '⏳';

  // Auto-redirect to Upgrade page once success
  useEffect(()=>{
    if (status === 'success') {
      navigate('/upgrade', { replace: true });
    }
  }, [status, navigate]);

  return (
    <div className="max-w-lg mx-auto p-6 text-center space-y-4">
      <div className="text-3xl">{icon}</div>
      <div className="text-lg font-semibold">
        {status==='loading' ? 'Đang xác nhận thanh toán' : status==='success' ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
      </div>
      <div className="text-sm text-neutral-600">{message}</div>
      <div className="pt-2">
        <Link to="/upgrade" className="hover:underline text-black dark:text-white">Quay lại trang Nâng cấp</Link>
        {status!=='success' && (
          <button
            onClick={()=>{
              setStatus('loading');
              setMessage('Đang kiểm tra lại...');
              // force refresh
              refreshMe().then(me=>{
                if (me?.isPro) {
                  setStatus('success');
                  setMessage('Thanh toán thành công! Tài khoản của bạn đã được nâng cấp Pro.');
                } else {
                  setStatus('pending');
                  setMessage('Chưa xác nhận được. Hệ thống có thể cần thêm thời gian để xử lý.');
                }
              }).catch(e=>{
                setStatus('failed');
                setMessage(e.message||'Lỗi khi kiểm tra lại.');
              });
            }}
            className="ml-4 text-xs px-3 py-1 rounded-2xl bg-black dark:bg-white text-white dark:text-black"
          >
            Làm mới
          </button>
        )}
      </div>
    </div>
  );
}
