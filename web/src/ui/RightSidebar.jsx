import React, { useState } from 'react';
import ChatModal from './ChatModal.jsx';

export default function RightSidebar(){
  const [open, setOpen] = useState(false);

  return (
    <aside className="hidden md:block col-span-3">
      <div className="sticky top-20 space-y-3">
        <div className="px-3 py-3 rounded-2xl flex items-center justify-between border border-black/10 dark:border-white/10 bg-white dark:bg-black">
          <div className="text-sm font-medium text-black dark:text-white">Bong bóng chat</div>
          <button
            onClick={()=>setOpen(true)}
            className="px-3 py-1 rounded-full text-sm text-white bg-black dark:bg-white dark:text-black hover:shadow"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            Mở
          </button>
        </div>

        <div className="p-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">Gợi ý</div>
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
