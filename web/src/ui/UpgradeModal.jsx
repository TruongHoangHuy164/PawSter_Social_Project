import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../state/auth.jsx';

function formatVND(n) {
  try { 
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n); 
  } catch { 
    return (n || 0).toLocaleString('vi-VN') + ' ₫'; 
  }
}

const PLAN_META = {
  '1m': { label: '1 tháng', highlight: false, desc: 'Giá gốc 39.000đ/tháng' },
  '6m': { label: '6 tháng', highlight: true, badge: '-10%', desc: 'Giảm 10% khi thanh toán 6 tháng' },
  '12m': { label: '12 tháng', highlight: true, badge: '-20%', desc: 'Giảm 20% khi thanh toán 12 tháng' }
};

export default function UpgradeModal({ isOpen, onClose }) {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('6m');
  const [creating, setCreating] = useState(false);

  const planList = useMemo(() => {
    if (!plans?.data) return [];
    return Object.entries(plans.data).map(([k, v]) => ({ key: k, ...v, ...PLAN_META[k] }));
  }, [plans]);

  useEffect(() => {
    if (!isOpen) return;
    
    let alive = true;
    (async () => {
      setLoadingPlans(true); 
      setError('');
      try {
        const res = await api.get('/payments/plans');
        if (!alive) return;
        setPlans(res.data);
      } catch(e) { 
        if (alive) setError(e.message || 'Không tải được bảng giá'); 
      } finally { 
        if (alive) setLoadingPlans(false); 
      }
    })();
    return () => { alive = false; };
  }, [isOpen]);

  const pay = async () => {
    if (!selected) return;
    setCreating(true); 
    setError('');
    try {
      const res = await api.post('/payments/momo/create', { plan: selected }, token);
      const { payUrl } = res.data.data || {};
      if (!payUrl) throw new Error('Không nhận được liên kết thanh toán');
      
      // Store info before redirect to track payment
      localStorage.setItem('pendingPayment', JSON.stringify({
        timestamp: Date.now(),
        plan: selected
      }));
      
      window.location.href = payUrl;
    } catch (e) { 
      setError(e.message || 'Không tạo được đơn MoMo'); 
    } finally { 
      setCreating(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-black border-b border-black/10 dark:border-white/10 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                Nâng cấp Pro
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Mở khóa tính năng đặc quyền
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {user?.isPro && user?.proExpiry && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Hạn Pro hiện tại: {(() => { 
                try { 
                  return new Date(user.proExpiry).toLocaleString('vi-VN'); 
                } catch { 
                  return ''; 
                } 
              })()}
            </div>
          )}

          {loadingPlans && (
            <div className="text-center py-8">
              <div className="animate-pulse text-neutral-500">Đang tải bảng giá...</div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{error}</div>
          )}

          {!loadingPlans && !error && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                {planList.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setSelected(p.key)}
                    className={`relative text-left rounded-2xl border p-4 transition-all ${
                      selected === p.key 
                        ? 'border-black dark:border-white ring-2 ring-black/10 dark:ring-white/10 bg-black/5 dark:bg-white/5' 
                        : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {p.badge && (
                      <span className="absolute -top-2 -right-2 bg-black dark:bg-white text-white dark:text-black text-xs px-2 py-0.5 rounded-full shadow font-bold">
                        {p.badge}
                      </span>
                    )}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="font-semibold text-lg">{p.label}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{PLAN_META[p.key]?.desc}</div>
                      </div>
                      <div className="text-black dark:text-white font-semibold">{formatVND(p.amount)}</div>
                    </div>
                    {selected === p.key && (
                      <div className="mt-3 text-xs text-black dark:text-white font-bold flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Đã chọn
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Benefits */}
              <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span>🎯</span>
                  Lợi ích Pro:
                </h3>
                <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Tăng giới hạn bạn bè lên 200 (từ 20)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Huy hiệu PRO đặc biệt
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Ưu tiên hỗ trợ khách hàng
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Truy cập sớm các tính năng mới
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={pay}
                  disabled={creating || !selected}
                  className="flex-1 px-6 py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black disabled:opacity-50 text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                  </svg>
                  {creating ? 'Đang tạo đơn MoMo...' : 'Thanh toán với MoMo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}