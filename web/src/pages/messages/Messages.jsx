import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../state/auth.jsx';
import { dmApi } from '../../utils/api.js';
import { useSocket } from '../../state/socket.jsx';
import Avatar from '../../ui/Avatar.jsx';

export default function Messages(){
  const { token, user } = useAuth();
  const { socket, connected } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const idsRef = useRef(new Set()); // chống trùng lặp message theo _id

  const formatAgo = (ts) => {
    if (!ts) return '';
    const t = typeof ts === 'string' || ts instanceof Date ? new Date(ts).getTime() : Number(ts);
    if (!t) return '';
    const diff = Date.now() - t;
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${Math.max(1, min)} phút`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} giờ`;
    const d = Math.floor(hr / 24);
    return `${d} ngày`;
  };

  useEffect(()=>{
    if (!token) return;
    dmApi.listConversations(token).then(res=>setConversations(res.data.data)).catch(console.error);
  },[token]);

  useEffect(()=>{
    if (!socket || !active) return;
    socket.emit('dm:join', active._id);
    return ()=>{ socket.emit('dm:leave', active._id); };
  },[socket, active]);

  useEffect(()=>{
    if (!token || !active) return;
    idsRef.current = new Set();
    dmApi.listMessages(active._id, 1, 40, token).then(res=>{
      const arr = res.data.data || [];
      idsRef.current = new Set(arr.map(m=>String(m._id)));
      setMessages(arr);
      setTimeout(()=>{ try{ listRef.current?.scrollTo({ top: 999999, behavior:'smooth' }); }catch{} }, 0);
    });
  },[token, active]);

  useEffect(()=>{
    if (!socket) return;
    const onNew = (payload)=>{
      const msg = payload?.message;
      if (!msg) return;
      if (String(msg.conversation) !== String(active?._id)) return;
      const id = String(msg._id);
      if (idsRef.current.has(id)) return; // bỏ qua trùng
      idsRef.current.add(id);
      setMessages(prev=>[...prev, msg]);
      setTimeout(()=>{ try{ listRef.current?.scrollTo({ top: 999999 }); }catch{} }, 0);
    };
    socket.on('dm:new_message', onNew);
    return ()=>socket.off('dm:new_message', onNew);
  },[socket, active]);

  // Khi nhận thông báo tin nhắn mới ở hội thoại khác, tăng badge
  useEffect(()=>{
    if (!socket) return;
    const onNotify = ({ conversationId, message }) => {
      // Nếu đang mở chính hội thoại đó, không tăng badge (sẽ nhận qua dm:new_message)
      if (String(active?._id) === String(conversationId)) return;
      setConversations(prev => prev.map(c =>
        String(c._id) === String(conversationId)
          ? { ...c, unreadCount: Math.max(0, Number(c.unreadCount||0)) + 1, lastMessage: message?.content || (message?.media?.length ? '[media]' : c.lastMessage), lastMessageAt: message?.createdAt || new Date().toISOString() }
          : c
      ));
    };
    socket.on('dm:notify', onNotify);
    return () => socket.off('dm:notify', onNotify);
  }, [socket, active]);

  const send = async (e)=>{
    e.preventDefault();
    if (!input.trim() || !active) return;
    try{
      const res = await dmApi.send(
        active._id,
        { to: (active.participants||[]).find(p=> String(p._id)!==String(user?._id))?._id, content: input },
        token
      );
      const msg = res.data.data;
      const id = String(msg._id);
      if (!idsRef.current.has(id)) {
        idsRef.current.add(id);
        setMessages(prev=>[...prev, msg]);
      }
      setInput('');
      setTimeout(()=>{ try{ listRef.current?.scrollTo({ top: 999999 }); }catch{} }, 0);
    }catch(err){ console.error(err); }
  };

  const openChatWith = async (otherId)=>{
    try{
      const res = await dmApi.getOrCreate(otherId, token);
      const conv = res.data.data;
      setActive(conv);
    }catch(e){ console.error(e); }
  };

  // Khi chọn 1 hội thoại, gọi API đánh dấu đã đọc và reset badge
  useEffect(()=>{
    if (!token || !active) return;
    dmApi.markRead(active._id, token).catch(()=>{});
    setConversations(prev => prev.map(c => String(c._id) === String(active._id) ? { ...c, unreadCount: 0 } : c));
  }, [token, active]);

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-80px)]">
      <aside className="col-span-5 md:col-span-4 lg:col-span-3 p-2 rounded-xl" style={{background:'rgba(155,99,114,0.06)', border:'1px solid rgba(43,27,34,0.08)'}}>
        <div className="font-semibold mb-2">Hội thoại</div>
        <div className="space-y-1 overflow-y-auto h-[calc(100%-40px)] pr-1">
          {conversations.map(c=>{
            const other = (c.participants||[]).find(p=> String(p._id) !== String(user?._id)) || {};
            return (
              <button key={c._id} onClick={()=>setActive(c)} className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 ${active?._id===c._id?'bg-[color:var(--panel)]':''}`}>
                <div className="relative">
                  <Avatar user={{ username: other.username, avatarUrl: other.avatarUrl }} size="sm" />
                  {Number(c.unreadCount||0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full text-[10px] leading-none px-1.5 py-0.5 border border-white">
                      {c.unreadCount > 9 ? '9+' : c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{other.username || 'Người dùng'}</div>
                  <div className="text-xs text-muted truncate">{c.lastMessage || 'Bắt đầu trò chuyện'}</div>
                </div>
                <div className="ml-auto text-[10px] text-muted whitespace-nowrap">{formatAgo(c.lastMessageAt)}</div>
              </button>
            );
          })}
        </div>
      </aside>
      <section className="col-span-7 md:col-span-8 lg:col-span-9 flex flex-col rounded-xl border" style={{borderColor:'var(--panel-border)'}}>
        {!active ? (
          <div className="m-auto text-sm text-muted">Chọn một hội thoại để bắt đầu</div>
        ) : (
          <>
            <header className="px-3 py-2 border-b flex items-center gap-3" style={{borderColor:'var(--panel-border)'}}>
              {(() => { const other = (active.participants||[]).find(p=> String(p._id) !== String(user?._id)) || {}; return (
                <>
                  <Avatar user={{ username: other.username, avatarUrl: other.avatarUrl }} size="sm" />
                  <div className="text-sm font-medium">{other.username || 'Người dùng'}</div>
                </>
              );})()}
            </header>
            <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 paw-bg">
              {messages.map(m=>{
                const mine = String(m.from) === String(user?._id) || String(m.from?._id) === String(user?._id);
                if (mine) {
                  return (
                    <div key={m._id} className="flex justify-end">
                      <div className="max-w-[70%] px-3 py-2 rounded-2xl ml-auto text-white bg-gradient-to-br from-[color:var(--accent)] to-violet-500">
                        <div>{m.content}</div>
                        <div className="text-[10px] text-white/70 mt-1 text-right">{formatAgo(m.createdAt)}</div>
                      </div>
                    </div>
                  );
                }
                const other = (active.participants||[]).find(p=> String(p._id) !== String(user?._id)) || {};
                return (
                  <div key={m._id} className="flex items-end gap-2">
                    <Avatar user={{ username: other.username, avatarUrl: other.avatarUrl }} size="sm" />
                    <div className="max-w-[70%] px-3 py-2 rounded-2xl bg-[color:var(--panel)]">
                      <div>{m.content}</div>
                      <div className="text-[10px] text-muted mt-1">{formatAgo(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="p-2 border-t flex items-center gap-2" style={{borderColor:'var(--panel-border)'}}>
              <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-transparent border" style={{borderColor:'var(--panel-border)'}} placeholder="Nhập tin nhắn..." />
              <button type="submit" className="px-4 py-2 rounded-xl text-white bg-gradient-to-br from-[color:var(--accent)] to-violet-500">Gửi</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
