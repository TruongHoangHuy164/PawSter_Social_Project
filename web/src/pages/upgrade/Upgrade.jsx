import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

function formatVND(n){
  try { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n); }
  catch { return (n||0).toLocaleString('vi-VN') + ' ₫'; }
}

const PLAN_META = {
  '1m': { label: '1 tháng', highlight: false, desc: 'Giá gốc 39.000đ/tháng' },
  '6m': { label: '6 tháng', highlight: true, badge: '-10%', desc: 'Giảm 10% khi thanh toán 6 tháng' },
  '12m': { label: '12 tháng', highlight: true, badge: '-20%', desc: 'Giảm 20% khi thanh toán 12 tháng' }
};

export default function Upgrade(){
  const { token, user } = useAuth();
  const [plans, setPlans] = useState(null); // { '1m': {months, amount}, ... }
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('6m');
  const [creating, setCreating] = useState(false);

  useEffect(()=>{
    let alive = true;
    (async()=>{
      setLoadingPlans(true); setError('');
      try {
        const res = await api.get('/payments/plans');
        if (!alive) return;
        setPlans(res.data);
      } catch(e){ if (alive) setError(e.message || 'Không tải được bảng giá'); }
      finally { if (alive) setLoadingPlans(false); }
    })();
    return () => { alive = false; };
  }, []);

  const planList = useMemo(()=>{
    if (!plans?.data) return [];
    return Object.entries(plans.data).map(([k, v])=>({ key:k, ...v, ...PLAN_META[k]}));
  }, [plans]);

  const pay = async ()=>{
    if (!selected) return;
    setCreating(true); setError('');
    try {
      const res = await api.post('/payments/momo/create', { plan: selected }, token);
      const { payUrl } = res.data.data || {};
      if (!payUrl) throw new Error('Không nhận được liên kết thanh toán');
      window.location.href = payUrl; // Redirect to MoMo
    } catch (e){ setError(e.message || 'Không tạo được đơn MoMo'); }
    finally { setCreating(false); }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nâng cấp Pro</h1>
        <p className="text-sm text-neutral-500">Tăng giới hạn bạn bè, có huy hiệu PRO, và nhiều đặc quyền khác.</p>
        {user?.isPro && user?.proExpiry && (
          <div className="text-xs text-emerald-600 mt-1">
            Hạn Pro hiện tại: {(() => { try { return new Date(user.proExpiry).toLocaleString('vi-VN'); } catch { return ''; } })()}
          </div>
        )}
      </div>

      {loadingPlans && <div className="text-sm text-neutral-500">Đang tải bảng giá…</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      {!loadingPlans && !error && (
        <div className="grid md:grid-cols-3 gap-4">
          {planList.map(p => (
            <button
              key={p.key}
              onClick={()=>setSelected(p.key)}
              className={`relative text-left rounded-lg border p-4 transition-all ${selected===p.key ? 'border-violet-500 ring-2 ring-violet-200' : 'border-neutral-200 hover:border-neutral-300'}`}
            >
              {p.badge && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full shadow">{p.badge}</span>
              )}
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-semibold text-lg">{p.label}</div>
                  <div className="text-xs text-neutral-500">{PLAN_META[p.key]?.desc}</div>
                </div>
                <div className="text-violet-600 font-semibold">{formatVND(p.amount)}</div>
              </div>
              {selected===p.key && <div className="mt-3 text-xs text-violet-600">Đã chọn</div>}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={pay}
          disabled={creating || !selected || user?.isPro}
          className="px-5 py-2 rounded bg-gradient-to-r from-violet-600 to-violet-500 disabled:opacity-50 text-sm font-medium text-white"
        >
          {creating ? 'Đang tạo đơn MoMo…' : 'Thanh toán với MoMo'}
        </button>
        {user?.isPro && <span className="text-sm text-emerald-500">Tài khoản của bạn đã là Pro</span>}
      </div>

      <div className="text-xs text-neutral-500">
        * Giá 1 tháng: 39.000đ; 6 tháng giảm 10%; 12 tháng giảm 20%.
      </div>
    </div>
  );
}
