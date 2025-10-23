import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../state/auth.jsx';

export default function ThreadEditor({ thread, onUpdated, onCancel }) {
  const { token, user } = useAuth();
  const [text, setText] = useState(thread.content || '');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]); // New files to add
  const [existingMedia, setExistingMedia] = useState(thread.media || []); // Existing media
  const [removedMediaIds, setRemovedMediaIds] = useState([]); // IDs of removed media
  const [signedUrls, setSignedUrls] = useState({}); // Signed URLs for existing media
  const [loadingMediaIds, setLoadingMediaIds] = useState({}); // Loading states for media
  const [progress, setProgress] = useState(0); // 0-100
  const [error, setError] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const stickerWrapRef = useRef(null);
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
  const tagWrapRef = useRef(null);

  const onSelect = (e) => {
    const list = Array.from(e.target.files || []);
    // Total media limit is 6 (including existing)
    const totalExistingCount = existingMedia.length - removedMediaIds.length;
    const availableSlots = Math.max(0, 6 - totalExistingCount);
    const merged = [...files, ...list].slice(0, availableSlots);
    setFiles(merged);
  };

  const removeFile = (idx) => setFiles(fs => fs.filter((_, i) => i !== idx));

  const removeExistingMedia = (mediaId) => {
    setRemovedMediaIds(prev => [...prev, mediaId]);
  };

  const restoreExistingMedia = (mediaId) => {
    setRemovedMediaIds(prev => prev.filter(id => id !== mediaId));
  };

  // Fetch signed URL for existing media
  const fetchSignedUrl = useCallback(async (mediaIndex, mediaId) => {
    setLoadingMediaIds(prev => {
      if (prev[mediaId]) return prev; // Already loading
      return { ...prev, [mediaId]: true };
    });

    setSignedUrls(prev => {
      if (prev[mediaId]) {
        setLoadingMediaIds(p => ({ ...p, [mediaId]: false }));
        return prev; // Already have URL
      }
      
      // Fetch URL
      api.get(`/media/thread/${thread._id}/${mediaIndex}`, token)
        .then(res => {
          const url = res.data.data.url;
          setSignedUrls(p => ({ ...p, [mediaId]: url }));
        })
        .catch(e => {
          console.error("Fetch signed URL failed", e);
        })
        .finally(() => {
          setLoadingMediaIds(p => ({ ...p, [mediaId]: false }));
        });
      
      return prev;
    });
  }, [thread._id, token]);

  // Helper to get consistent media key like in ThreadItem  
  const getMediaKey = useCallback((index, media) => {
    return media ? `${media._id}-${index}` : `idx-${index}`;
  }, []);

  // Clear cache and reload thumbnails when thread changes
  useEffect(() => {
    // Clear cached signed URLs when thread changes to avoid stale thumbnails
    setSignedUrls({});
    setLoadingMediaIds({});
    
    // Load thumbnails for existing images after a short delay to avoid spam
    const timeoutId = setTimeout(() => {
      existingMedia.forEach((media, index) => {
        if (media.type === 'image' && !removedMediaIds.includes(media._id)) {
          // Pass media object instead of just ID
          fetchSignedUrlWithKey(index, media);
        }
      });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [thread._id]);

  // Updated fetch function using mediaKey like ThreadItem
  const fetchSignedUrlWithKey = useCallback(async (mediaIndex, media) => {
    if (!media) return;
    
    const mediaKey = getMediaKey(mediaIndex, media);
    
    setLoadingMediaIds(prev => {
      if (prev[mediaKey]) return prev; // Already loading
      return { ...prev, [mediaKey]: true };
    });

    setSignedUrls(prev => {
      if (prev[mediaKey]) {
        setLoadingMediaIds(p => ({ ...p, [mediaKey]: false }));
        return prev; // Already have URL
      }
      
      // Fetch URL
      api.get(`/media/thread/${thread._id}/${mediaIndex}`, token)
        .then(res => {
          const url = res.data.data.url;
          setSignedUrls(p => ({ ...p, [mediaKey]: url }));
        })
        .catch(e => {
          console.error("Fetch signed URL failed", e);
        })
        .finally(() => {
          setLoadingMediaIds(p => ({ ...p, [mediaKey]: false }));
        });
      
      return prev;
    });
  }, [thread._id, token, getMediaKey]);

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
        stickerWrapRef.current,
        stickerPanelRef.current,
        mentionPanelRef.current,
        friendsPanelRef.current,
        tagWrapRef.current
      ];
      const inside = targets.some((el) => el && el.contains(e.target));
      if (!inside) { 
        setShowStickers(false); 
        setShowMention(false); 
        setShowFriends(false); 
      }
    };
    const onKey = (e) => { 
      if (e.key === 'Escape') { 
        setShowStickers(false); 
        setShowMention(false); 
        setShowFriends(false); 
      } 
    };
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
    insertAtCursor(`@${u.username} `);
  };

  const stickers = ['🐶','🐱','🐾','🦴','🦮','🐕','🐈','🐕‍🦺','🐈‍⬛','🐹','🐰','🦊','🐻','🦝','🐼'];

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() && existingMedia.length === removedMediaIds.length && files.length === 0) {
      setError('Nội dung hoặc media là bắt buộc');
      return;
    }
    
    setLoading(true);
    setError('');
    setProgress(0);
    
    try {
      // If there are new files to upload or media changes, use FormData approach
      if (files.length > 0 || removedMediaIds.length > 0) {
        const form = new FormData();
        if (text.trim()) form.append('content', text.trim());
        
        // Add new files
        files.forEach(f => form.append('media', f));
        
        // Add removed media IDs (each as separate field)
        removedMediaIds.forEach(id => form.append('removedMedia', id));
        
        // Use XHR for progress tracking
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PATCH', (import.meta.env.VITE_API_URL || '/api') + `/threads/${thread._id}`);
          if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
          
          xhr.upload.onprogress = (ev) => {
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
                  // Clear signed URLs cache to ensure fresh thumbnails
                  setSignedUrls({});
                  setLoadingMediaIds({});
                  
                  // Force parent component to refresh thumbnails after a short delay
                  setTimeout(() => {
                    onUpdated?.(json.data);
                  }, 200);
                  
                  resolve(json.data);
                } catch (e) { 
                  reject(e); 
                }
              } else {
                reject(new Error(xhr.statusText || 'Update failed'));
              }
            }
          };
          
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(form);
        });
        
        setProgress(100);
      } else {
        // Simple text-only update
        const res = await api.patch(`/threads/${thread._id}`, { 
          content: text.trim() 
        }, token);
        // Clear signed URLs cache to ensure fresh thumbnails
        setSignedUrls({});
        setLoadingMediaIds({});
        
        // Force parent component to refresh thumbnails after a short delay
        setTimeout(() => {
          onUpdated?.(res.data.data);
        }, 200);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Lỗi cập nhật bài viết');
    } finally { 
      setLoading(false); 
    }
  };

  const handleCancel = () => {
    setText(thread.content || '');
    setFiles([]);
    setRemovedMediaIds([]);
    setError('');
    onCancel?.();
  };

  // Calculate remaining media slots
  const activeExistingMedia = existingMedia.filter(m => !removedMediaIds.includes(m._id));
  const totalMediaCount = activeExistingMedia.length + files.length;
  const remainingSlots = Math.max(0, 6 - totalMediaCount);

  return (
    <form onSubmit={submit} className="rounded-2xl p-4 space-y-3 border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Chỉnh sửa bài viết</h3>
        <div className="text-xs text-blue-600 dark:text-blue-300">
          Media: {totalMediaCount}/6 (còn {remainingSlots} slot)
        </div>
      </div>

      {/* Input shell */}
      <div className="rounded-xl p-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <div className="space-y-3">
          {/* Text area */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); updateMentionState(); }}
            onKeyUp={updateMentionState}
            maxLength={500}
            rows={4}
            placeholder="Chia sẻ khoảnh khắc cùng thú cưng của bạn... 🐾"
            className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none bg-transparent border border-black/10 dark:border-white/10 text-black dark:text-white focus:ring-2 focus:ring-blue-500/50"
            onKeyDown={(e) => { 
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { 
                if (!loading && (text.trim() || totalMediaCount > 0)) submit(e);
              } 
            }}
          />
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Media */}
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={remainingSlots === 0}
              title={remainingSlots === 0 ? "Đã đạt giới hạn media" : "Thêm ảnh/video/audio"} 
              className={`h-9 w-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 transition-colors ${
                remainingSlots === 0 
                  ? "opacity-50 cursor-not-allowed" 
                  : "text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </button>
            
            {/* Stickers */}
            <div className="relative" ref={stickerWrapRef}>
              <button type="button" onClick={() => setShowStickers(s => !s)} title="Chọn sticker" className="h-9 w-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12v-2a8 8 0 1 0-16 0v2"/>
                  <path d="M2 12h20"/>
                  <path d="M7 17c2 1 4 1 6 0"/>
                </svg>
              </button>
            </div>
            
            {/* Tag friend */}
            <div className="relative" ref={tagWrapRef}>
              <button type="button" onClick={openFriends} title="Gắn thẻ bạn bè" className="h-9 w-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </button>
            </div>
            
            <div className="flex-1" />
            
            {/* Character count */}
            <span className="text-xs text-neutral-500">{text.length}/500</span>
          </div>
        </div>
      </div>

      {/* Sticker selection panel */}
      {showStickers && (
        <div ref={stickerPanelRef} className="rounded-xl p-3 shadow-xl bg-white dark:bg-black border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Chọn sticker</div>
            <button type="button" onClick={() => setShowStickers(false)} className="h-8 w-8 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5" aria-label="Đóng sticker">×</button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {stickers.map((s, i) => (
              <button key={i} type="button" onClick={() => insertAtCursor(s + ' ')} className="h-10 w-10 text-xl leading-none rounded-xl hover:scale-105 transition-transform border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5" title={`Sticker ${i + 1}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mention suggestions */}
      {showMention && (
        <div ref={mentionPanelRef} className="rounded-xl p-2 shadow-xl bg-white dark:bg-black border border-black/10 dark:border-white/10">
          <div className="text-xs px-2 pb-1 text-neutral-600 dark:text-neutral-300">Gắn thẻ bạn bè</div>
          {mentionLoading ? (
            <div className="text-xs px-2 py-1 text-neutral-500">Đang tìm...</div>
          ) : (
            <div className="max-h-48 overflow-auto divide-y divide-black/10 dark:divide-white/10">
              {mentionResults.length === 0 ? (
                <div className="text-xs px-2 py-2 text-neutral-500">Không tìm thấy</div>
              ) : (
                mentionResults.slice(0, 8).map(u => (
                  <button key={u._id} type="button" onClick={() => pickMention(u)} className="w-full flex items-center gap-2 px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-left">
                    <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[11px]">
                      {(u.username || '?').slice(0, 1).toUpperCase()}
                    </div>
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
        <div ref={friendsPanelRef} className="rounded-xl p-2 shadow-xl bg-white dark:bg-black border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs px-2 text-neutral-600 dark:text-neutral-300">Chọn bạn để gắn thẻ</div>
            <button type="button" onClick={() => setShowFriends(false)} className="h-7 w-7 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5" aria-label="Đóng">×</button>
          </div>
          {friendsLoading ? (
            <div className="text-xs px-2 py-1 text-neutral-500">Đang tải...</div>
          ) : (
            <div className="max-h-48 overflow-auto divide-y divide-black/10 dark:divide-white/10">
              {(friends || []).length === 0 ? (
                <div className="text-xs px-2 py-2 text-neutral-500">Không có bạn bè</div>
              ) : (
                friends.slice(0, 30).map(f => (
                  <button key={f._id} type="button" onClick={() => pickFriend(f)} className="w-full flex items-center gap-2 px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-left">
                    <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[11px]">
                      {(f.username || '?').slice(0, 1).toUpperCase()}
                    </div>
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
      <input 
        ref={fileInputRef} 
        multiple 
        onChange={onSelect} 
        type="file" 
        accept="image/*,video/*,audio/*" 
        className="hidden" 
        disabled={remainingSlots === 0}
      />

      {/* Existing media management */}
      {existingMedia.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Media hiện tại:</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))' }}>
            {existingMedia.map((m, index) => {
              const isRemoved = removedMediaIds.includes(m._id);
              const mediaKey = getMediaKey(index, m);
              const url = signedUrls[mediaKey];
              const loading = loadingMediaIds[mediaKey];
              
              return (
                <div key={m._id} className={`relative group rounded-lg overflow-hidden border ${
                  isRemoved 
                    ? 'opacity-50 border-red-300 dark:border-red-700' 
                    : 'border-black/10 dark:border-white/10'
                }`}>
                  <div className="h-20 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center relative">
                    {m.type === 'image' && url ? (
                      <img 
                        src={url} 
                        alt="Media thumbnail" 
                        className="w-full h-full object-cover" 
                      />
                    ) : m.type === 'image' && loading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                      </div>
                    ) : m.type === 'image' ? (
                      <span className="text-xs">🖼️ Ảnh</span>
                    ) : m.type === 'video' ? (
                      <span className="text-xs">🎥 Video</span>
                    ) : m.type === 'audio' ? (
                      <span className="text-xs">🎵 Audio</span>
                    ) : (
                      <span className="text-xs">📁 File</span>
                    )}
                  </div>
                  {isRemoved ? (
                    <button
                      type="button"
                      onClick={() => restoreExistingMedia(m._id)}
                      className="absolute inset-0 bg-red-500/20 flex items-center justify-center"
                      title="Phục hồi"
                    >
                      <span className="bg-white dark:bg-black px-2 py-1 rounded text-xs font-medium">
                        Phục hồi
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeExistingMedia(m._id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs leading-none shadow hover:scale-105 transition"
                      title="Xóa"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New media previews */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Media mới:</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))' }}>
            {files.map((f, i) => {
              const url = URL.createObjectURL(f);
              const type = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'other';
              const fileKey = `${f.name}-${f.size}-${f.lastModified}-${i}`;
              return (
                <div key={fileKey} className="relative group rounded-lg overflow-hidden border border-green-300 dark:border-green-700">
                  {type === 'image' && <img src={url} alt={f.name} className="object-cover w-full h-20" />}
                  {type === 'video' && <video src={url} className="w-full h-20 object-cover" muted />}
                  {type === 'audio' && (
                    <div className="h-20 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      <span className="text-xs text-center px-2">🎵 {f.name.slice(0, 10)}...</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs leading-none shadow hover:scale-105 transition"
                    title="Xóa"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {loading && files.length > 0 && (
        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: progress + '%' }} />
        </div>
      )}

      {/* Error message */}
      {error && <div className="text-xs text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded">{error}</div>}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || (!text.trim() && totalMediaCount === 0)}
          className="px-4 py-2 rounded-xl font-medium text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          )}
          {loading ? 'Đang cập nhật...' : 'Cập nhật'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 rounded-xl font-medium text-sm border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}