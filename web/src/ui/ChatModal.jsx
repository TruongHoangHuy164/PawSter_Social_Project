import React, { useEffect, useRef } from 'react';

export default function ChatModal({ open, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-end"
      onMouseDown={handleBackdrop}
      aria-modal="true"
      role="dialog"
      aria-labelledby="chat-modal-title"
    >
      <div
        ref={panelRef}
        className="m-4 md:mr-6 w-full md:w-[380px] h-[70vh] md:h-[520px] rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--panel)', border: '1px solid var(--panel-border)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--panel-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300/60 to-violet-300/60 dark:from-neutral-700 dark:to-neutral-600 flex items-center justify-center">💬</div>
            <div className="font-semibold" id="chat-modal-title">Hợp thoại</div>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Đóng hợp thoại"
          >✕</button>
        </header>

        <div className="flex flex-col h-[calc(100%-52px)]">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Placeholder messages */}
            <div className="flex gap-2 items-end">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center text-xs">A</div>
              <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-sm text-sm" style={{ background: 'rgba(155,99,114,0.08)', color: 'var(--text)' }}>
                Xin chào! Hãy bắt đầu cuộc trò chuyện nhé 🐾
              </div>
            </div>
            <div className="flex gap-2 items-end justify-end">
              <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-br-sm text-sm text-white bg-gradient-to-br from-[color:var(--accent)] to-violet-500">
                Chào bạn! ❤️
              </div>
            </div>
          </div>

          <form className="border-t p-2 flex items-center gap-2" style={{ borderColor: 'var(--panel-border)' }} onSubmit={(e)=>e.preventDefault()}>
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              className="flex-1 px-3 py-2 rounded-xl bg-transparent border"
              style={{ borderColor: 'var(--panel-border)', color: 'var(--text)' }}
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl text-white bg-gradient-to-br from-[color:var(--accent)] to-violet-500 hover:shadow"
            >Gửi</button>
          </form>
        </div>
      </div>
    </div>
  );
}
