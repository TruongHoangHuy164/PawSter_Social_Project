import React, { useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';

export default function IncomingCallModal({ isOpen, onAccept, onDecline, callerUser }) {
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    // Simple ringtone using Web Audio API to avoid bundling assets
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 750; // Hz
      gain.gain.value = 0; // start muted
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      oscRef.current = osc;
      // Pulse on/off like a ringtone
      intervalRef.current = setInterval(() => {
        if (!gain) return;
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      }, 900);
    } catch {}
    return () => {
      try { clearInterval(intervalRef.current); } catch {}
      try { oscRef.current?.stop(); } catch {}
      try { audioCtxRef.current?.close(); } catch {}
      oscRef.current = null;
      audioCtxRef.current = null;
      intervalRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black p-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Avatar user={{ username: callerUser?.username, avatarUrl: callerUser?.avatarUrl }} size="sm" />
          <div className="text-sm font-medium">{callerUser?.username || 'Cuộc gọi đến'}</div>
        </div>
        <div className="text-xs text-muted mb-4">Đang gọi video...</div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onDecline} className="px-4 py-2 rounded-xl border">Từ chối</button>
          <button onClick={onAccept} className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black">Chấp nhận</button>
        </div>
      </div>
    </div>
  );
}
