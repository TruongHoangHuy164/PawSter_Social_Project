import React, { useState } from 'react';
import ChatModal from './ChatModal.jsx';

export default function RightSidebar(){
  const [open, setOpen] = useState(false);

  return (
    <aside className="hidden md:block col-span-3">
      <div className="sticky top-20 space-y-3">
        <div className="px-3 py-3 rounded-xl flex items-center justify-between" style={{ background: 'rgba(155,99,114,0.06)', border: '1px solid rgba(43,27,34,0.08)' }}>
          <div className="text-sm font-medium" style={{ color: '#2b1b22' }}>Bong bóng chat</div>
          <button
            onClick={()=>setOpen(true)}
            className="px-3 py-1 rounded-full text-sm text-white bg-gradient-to-br from-[color:var(--accent)] to-violet-500 hover:shadow"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            Mở
          </button>
        </div>

        <div className="p-3 rounded-xl" style={{ background: 'rgba(155,99,114,0.06)', border: '1px solid rgba(43,27,34,0.08)' }}>
          <div className="text-sm muted">Gợi ý</div>
          <ul className="mt-2 text-sm space-y-1">
            <li>• Nhấn mở để bắt đầu trò chuyện</li>
            <li>• Hỗ trợ đóng bằng Esc hoặc bấm ra ngoài</li>
          </ul>
        </div>
      </div>

      <ChatModal open={open} onClose={()=>setOpen(false)} />
    </aside>
  );
}
