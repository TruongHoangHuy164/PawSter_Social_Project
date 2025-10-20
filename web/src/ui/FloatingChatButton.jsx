import React, { useState, useEffect } from 'react';
import ChatModal from './ChatModal.jsx';

export default function FloatingChatButton(){
  const [open, setOpen] = useState(false);

  // Optional: keyboard shortcut to open (Alt+C)
  useEffect(()=>{
    const onKey = (e)=>{
      if ((e.altKey || e.metaKey) && (e.key?.toLowerCase?.() === 'c')) setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  },[]);

  return (
    <>
      <button
        onClick={()=>setOpen(true)}
        className="fixed z-40 bottom-20 md:bottom-6 right-4 md:right-6 rounded-full shadow-2xl px-4 py-3 flex items-center gap-2 text-white bg-black dark:bg-white dark:text-black hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition"
        aria-label="Mở hợp thoại"
      >
        <span className="text-lg">💬</span>
        <span className="hidden sm:inline text-sm font-semibold">Chat</span>
      </button>
      <ChatModal open={open} onClose={()=>setOpen(false)} />
    </>
  );
}
