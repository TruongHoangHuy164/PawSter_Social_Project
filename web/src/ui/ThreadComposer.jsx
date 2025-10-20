import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../state/auth.jsx';

export default function ThreadComposer({ onCreated }){
  const { token, user } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]); // File[]
  const [progress, setProgress] = useState(0); // 0-100
  const [error, setError] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const stickerWrapMobileRef = useRef(null);
  const stickerWrapDesktopRef = useRef(null);
  const stickerPanelRef = useRef(null);

  // Mentions (tag friend)
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const mentionPanelRef = useRef(null);
  const mentionDebounceRef = useRef(0);

  // Friends (tag friend via button)
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const friendsPanelRef = useRef(null);
  const tagWrapMobileRef = useRef(null);
  const tagWrapDesktopRef = useRef(null);

  const onSelect = (e) => {
    const list = Array.from(e.target.files || []);
    // Limit to 6 like backend
    const merged = [...files, ...list].slice(0,6);
    setFiles(merged);
  };

  const removeFile = (idx) => setFiles(fs => fs.filter((_,i)=>i!==idx));

  const insertAtCursor = useCallback((textToInsert) => {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + textToInsert);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + textToInsert + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + textToInsert.length;
      el.setSelectionRange(pos, pos);
    });
  }, [text]);

  // Detect @mention token near caret
  const updateMentionState = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return setShowMention(false);
    const pos = el.selectionStart ?? 0;
    const value = el.value;
    let start = pos - 1;
    while (start >= 0 && !/\s/.test(value[start])) start--;
    start += 1;
    const token = value.slice(start, pos);
    if (token.startsWith('@')) {
      const q = token.slice(1);
      if (q.length >= 2) {
        setMentionQuery(q);
        setShowMention(true);
        return;
      }
    }
    setShowMention(false);
    setMentionQuery('');
  }, []);

  // Fetch mention suggestions (debounced)
  useEffect(() => {
    if (!showMention || !mentionQuery) return;
    window.clearTimeout(mentionDebounceRef.current);
    mentionDebounceRef.current = window.setTimeout(async () => {
      try {
        setMentionLoading(true);
        const res = await api.get(`/users/search?q=${encodeURIComponent(mentionQuery)}`, token);
        setMentionResults(res.data.data || []);
      } catch (e) {
        setMentionResults([]);
      } finally {
        setMentionLoading(false);
      }
    }, 200);
    return () => window.clearTimeout(mentionDebounceRef.current);
  }, [showMention, mentionQuery, token]);

  const pickMention = (u) => {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    const value = el.value;
    let start = pos - 1;
    while (start >= 0 && !/\s/.test(value[start])) start--;
    start += 1;
    const before = value.slice(0, start);
    const after = value.slice(pos);
    const insertion = `@${u.username} `;
    const next = before + insertion + after;
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + insertion.length;
      el.setSelectionRange(caret, caret);
    });
    setShowMention(false);
  };

  // Close panels with outside click or Escape
  useEffect(() => {
    if (!showStickers && !showMention && !showFriends) return;
    const onDocClick = (e) => {
      const targets = [
        stickerWrapMobileRef.current,
        stickerWrapDesktopRef.current,
        stickerPanelRef.current,
        mentionPanelRef.current,
        friendsPanelRef.current,
        tagWrapMobileRef.current,
        tagWrapDesktopRef.current
      ];
      const inside = targets.some((el) => el && el.contains(e.target));
      if (!inside) { setShowStickers(false); setShowMention(false); setShowFriends(false); }
    };
    const onKey = (e) => { if (e.key === 'Escape') { setShowStickers(false); setShowMention(false); setShowFriends(false); } };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showStickers, showMention, showFriends]);

  const openFriends = async () => {
    setShowFriends((prev) => !prev);
    if (!showFriends && friends.length === 0 && user?._id) {
      try {
        setFriendsLoading(true);
        const res = await api.get(`/users/${user._id}/friends`, token);
        setFriends(res.data.data || []);
      } catch (e) {
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    }
  };

  const pickFriend = (u) => {
    // Insert @username at cursor
    insertAtCursor(`@${u.username} `);
  };

  const stickers = ['🐶','🐱','🐾','🦴','🦮','🐕','🐈','🐕\u200d🦺','🐈\u200d⬛','🐹','🐰','🦊','🐻','🦝','🐼'];

  const submit = async (e)=>{
    e.preventDefault();
    if (!text.trim() && files.length===0) return;
    setLoading(true);
    setError('');
    setProgress(0);
    try {
      if (files.length) {
        const form = new FormData();
        if (text.trim()) form.append('content', text.trim());
        files.forEach(f=> form.append('media', f));
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
            xhr.open('POST', (import.meta.env.VITE_API_URL || '/api') + '/threads');
            if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.upload.onprogress = (ev)=>{
              if (ev.lengthComputable) {
                const pct = Math.round((ev.loaded / ev.total) * 100);
                setProgress(pct);
              }
            };
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const json = JSON.parse(xhr.responseText);
                    onCreated?.(json.data);
                    resolve();
                  } catch (e) { reject(e); }
                } else {
                  reject(new Error(xhr.statusText || 'Upload failed'));
                }
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(form);
        });
        setText('');
        setFiles([]);
        setProgress(100);
      } else {
        const res = await api.post('/threads', { content: text.trim() }, token);
        onCreated?.(res.data.data);
        setText('');
      }
    } catch (e){
      console.error(e);
      setError(e.message || 'Lỗi upload');
    } finally { setLoading(false); }
  };

  return (
    <form id="thread-composer" onSubmit={submit} className="rounded-2xl p-5 space-y-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black">
      {/* Input shell */}
  <div className="rounded-2xl p-2 md:p-3 transition-all duration-200 border border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <div className="flex items-end gap-2 md:gap-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e)=>{ setText(e.target.value); updateMentionState(); }}
              onKeyUp={updateMentionState}
              maxLength={500}
              rows={3}
              placeholder="Chia sẻ khoảnh khắc cùng thú cưng của bạn... 🐾"
              className="w-full resize-none rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm outline-none bg-transparent border border-black/10 dark:border-white/10 text-black dark:text-white"
              onKeyDown={(e)=>{ if ((e.ctrlKey||e.metaKey) && e.key==='Enter'){ if (!loading && (text.trim()||files.length>0)) submit(e);} }}
            />
            {/* Mobile actions */}
            <div className="mt-2 flex items-center justify-between md:hidden">
              <div className="flex items-center gap-2">
                {/* Media */}
                <button type="button" onClick={()=>fileInputRef.current?.click()} title="Thêm ảnh/video/audio" className="h-9 w-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </button>
                {/* Stickers */}
                <div className="relative" ref={stickerWrapMobileRef}>
                  <button type="button" onClick={()=>setShowStickers(s=>!s)} title="Chọn sticker" className="h-9 w-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v-2a8 8 0 1 0-16 0v2"/><path d="M2 12h20"/><path d="M7 17c2 1 4 1 6 0"/></svg>
                  </button>
                </div>
                {/* Tag friend */}
                <div className="relative" ref={tagWrapMobileRef}>
                  <button type="button" onClick={openFriends} title="Gắn thẻ bạn bè" className="h-9 w-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </button>
                </div>
              </div>
              {/* Removed duplicate submit button on mobile to avoid redundancy */}
            </div>
          </div>
          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <button type="button" onClick={()=>fileInputRef.current?.click()} title="Thêm ảnh/video/audio" className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm hover:scale-[1.03] transition border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </button>
            <div className="relative" ref={stickerWrapDesktopRef}>
              <button type="button" onClick={()=>setShowStickers(s=>!s)} title="Chọn sticker" className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm hover:scale-[1.03] transition border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v-2a8 8 0 1 0-16 0v2"/><path d="M2 12h20"/><path d="M7 17c2 1 4 1 6 0"/></svg>
              </button>
            </div>
            {/* Tag friend */}
            <div className="relative" ref={tagWrapDesktopRef}>
              <button type="button" onClick={openFriends} title="Gắn thẻ bạn bè" className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm hover:scale-[1.03] transition border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticker selection panel */}
      {showStickers && (
  <div ref={stickerPanelRef} className="-mt-1 rounded-2xl p-3 md:p-4 shadow-2xl bg-white dark:bg-black border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Chọn sticker</div>
            <button type="button" onClick={()=>setShowStickers(false)} className="h-8 w-8 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5" aria-label="Đóng sticker">×</button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {stickers.map((s,i)=> (
              <button key={i} type="button" onClick={()=> insertAtCursor(s + ' ')} className="h-10 w-10 md:h-12 md:w-12 text-xl md:text-2xl leading-none rounded-xl hover:scale-105 transition-transform border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5" title={`Sticker ${i+1}`}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Mention suggestions */}
      {showMention && (
  <div ref={mentionPanelRef} className="-mt-1 rounded-2xl p-2 shadow-xl bg-white dark:bg-black border border-black/10 dark:border-white/10">
          <div className="text-xs px-2 pb-1 text-neutral-600 dark:text-neutral-300">Gắn thẻ bạn bè</div>
          {mentionLoading ? (
            <div className="text-xs px-2 py-1 text-neutral-500">Đang tìm...</div>
          ) : (
            <div className="max-h-48 overflow-auto divide-y divide-black/10 dark:divide-white/10">
              {mentionResults.length === 0 ? (
                <div className="text-xs px-2 py-2 text-neutral-500">Không tìm thấy</div>
              ) : (
                mentionResults.slice(0,8).map(u => (
                  <button key={u._id} type="button" onClick={()=>pickMention(u)} className="w-full flex items-center gap-2 px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-left">
                    <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[11px]">{(u.username||'?').slice(0,1).toUpperCase()}</div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{u.username}</div>
                      <div className="text-[11px] text-neutral-500">{u.email}</div>
                    </div>
                    {u.isPro && <span className="text-[10px] px-2 py-0.5 rounded-full border border-black/15 dark:border-white/15 text-neutral-700 dark:text-neutral-300">PRO</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Friends list panel */}
      {showFriends && (
  <div ref={friendsPanelRef} className="-mt-1 rounded-2xl p-2 shadow-xl bg-white dark:bg-black border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs px-2 text-neutral-600 dark:text-neutral-300">Chọn bạn để gắn thẻ</div>
            <button type="button" onClick={()=>setShowFriends(false)} className="h-7 w-7 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5" aria-label="Đóng">×</button>
          </div>
          {friendsLoading ? (
            <div className="text-xs px-2 py-1 text-neutral-500">Đang tải...</div>
          ) : (
            <div className="max-h-48 overflow-auto divide-y divide-black/10 dark:divide-white/10">
              {(friends || []).length === 0 ? (
                <div className="text-xs px-2 py-2 text-neutral-500">Không có bạn bè</div>
              ) : (
                friends.slice(0, 30).map(f => (
                  <button key={f._id} type="button" onClick={()=>pickFriend(f)} className="w-full flex items-center gap-2 px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-left">
                    <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[11px]">{(f.username||'?').slice(0,1).toUpperCase()}</div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{f.username}</div>
                      <div className="text-[11px] text-neutral-500">{f.email}</div>
                    </div>
                    {f.isPro && <span className="text-[10px] px-2 py-0.5 rounded-full border border-black/15 dark:border-white/15 text-neutral-700 dark:text-neutral-300">PRO</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} multiple onChange={onSelect} type="file" accept="image/*,video/*,audio/*" className="hidden" />

      {/* Media previews */}
      {files.length>0 && (
        <div className="mt-2 grid gap-2" style={{gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))'}}>
          {files.map((f,i)=>{
            const url = URL.createObjectURL(f);
            const type = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'other';
            return (
              <div key={i} className="relative group rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'rgba(155,99,114,0.06)', border: '1px solid rgba(43,27,34,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {type==='image' && <img src={url} alt={f.name} className="object-cover w-full h-20" />}
                {type==='video' && <video src={url} className="w-full h-20 object-cover" muted />}
                {type==='audio' && <span className="text-[11px] text-gray-600 truncate px-2 py-3 w-full text-center">🎵 {f.name}</span>}
                <button type="button" onClick={()=>removeFile(i)} className="absolute top-1 right-1 bg-white/90 text-[#dc2626] rounded-full w-6 h-6 text-sm leading-none shadow hover:scale-105 transition" title="Xóa">×</button>
              </div>
            );
          })}
        </div>
      )}

      {files.length>0 && loading && (
        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded overflow-hidden">
          <div className="h-full bg-black dark:bg-white" style={{ width: progress+'%' }} />
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{text.length}/500</span>
        <button disabled={loading || (!text.trim() && files.length===0)} className="btn-lux disabled:opacity-40 font-medium text-sm">{loading? 'Đang đăng...' : 'Đăng'}</button>
      </div>
    </form>
  );
}
