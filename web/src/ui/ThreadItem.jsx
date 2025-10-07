import React, { useEffect, useState, useCallback, useRef } from 'react';
import ProBadge from './ProBadge.jsx';
import { api } from '../utils/api.js';
import { useAuth } from '../state/auth.jsx';

export default function ThreadItem({ thread, onDelete }){
  const { user, token } = useAuth();
  const mine = user && thread.author && thread.author._id === user._id;
  const [signed, setSigned] = useState({}); // index -> url
  const [loadingIdx, setLoadingIdx] = useState({}); // index -> boolean
  const [errorIdx, setErrorIdx] = useState({});
  const mediaRefs = useRef({}); // index -> DOM element for video/audio containers

  const fetchSigned = useCallback(async (i) => {
    if (signed[i] || loadingIdx[i]) return;
    setLoadingIdx(s => ({ ...s, [i]: true }));
    try {
      const res = await api.get(`/media/thread/${thread._id}/${i}`, token);
      const url = res.data.data.url;
      setSigned(s => ({ ...s, [i]: url }));
    } catch (e) {
      console.error('Fetch signed failed', e);
      setErrorIdx(s => ({ ...s, [i]: true }));
    } finally {
      setLoadingIdx(s => ({ ...s, [i]: false }));
    }
  }, [signed, loadingIdx, thread._id, token]);

  // Preload images immediately (lightweight) but defer video/audio until interaction
  useEffect(() => {
    if (thread.media?.length) {
      thread.media.forEach((m, i) => { if (m.type === 'image') fetchSigned(i); });
    }
  }, [thread.media, fetchSigned]);

  // Auto-load video & audio when they enter viewport (lazy intersection based)
  useEffect(() => {
    if (!thread.media || !thread.media.length) return;
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      // Fallback: immediately fetch all non-image media
      thread.media.forEach((m, i) => {
        if ((m.type === 'video' || m.type === 'audio') && !signed[i] && !loadingIdx[i] && !errorIdx[i]) {
          fetchSigned(i);
        }
      });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idxAttr = entry.target.getAttribute('data-media-index');
            if (idxAttr != null) {
              const idx = Number(idxAttr);
              if (!signed[idx] && !loadingIdx[idx] && !errorIdx[idx]) {
                fetchSigned(idx);
              }
              observer.unobserve(entry.target);
            }
        }
      });
    }, { root: null, rootMargin: '150px', threshold: 0.1 });

    thread.media.forEach((m, i) => {
      if ((m.type === 'video' || m.type === 'audio') && !signed[i]) {
        const el = mediaRefs.current[i];
        if (el) observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [thread.media, signed, loadingIdx, errorIdx, fetchSigned]);
  const del = async ()=>{
    if (!confirm('Xóa bài này?')) return;
    try { await api.del(`/threads/${thread._id}`, token); onDelete?.(thread._id); } catch(e){ console.error(e); }
  };
  return (
    <div className="p-4 border border-neutral-800 rounded-lg bg-neutral-900 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{thread.author?.username || 'Unknown'} {thread.author?.isPro && <ProBadge />}</span>
        <span className="text-neutral-500 text-xs">{new Date(thread.createdAt).toLocaleString()}</span>
        {mine && <button onClick={del} className="ml-auto text-xs text-red-400 hover:underline">Xóa</button>}
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{thread.content}</div>
      {thread.media && thread.media.length > 0 && (
        <div className="space-y-2">
          <div className="grid gap-2" style={{gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))'}}>
            {thread.media.map((m,i)=>{
              const url = signed[i];
              const loading = loadingIdx[i];
              const error = errorIdx[i];
              if (m.type === 'image') {
                return (
                  <div key={i} className="relative group">
                    {!url && !error && <div className="flex items-center justify-center border border-neutral-700 rounded w-full h-40 text-xs text-neutral-500">Đang tải...</div>}
                    {error && <div className="border border-red-600 text-red-400 text-xs p-2 rounded">Lỗi ảnh</div>}
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer" className="block group">
                        <img src={url} alt={m.mimeType} className="rounded border border-neutral-700 object-cover w-full h-40 group-hover:opacity-90" />
                      </a>
                    )}
                  </div>
                );
              }
              if (m.type === 'video') {
                return (
                  <div
                    key={i}
                    data-media-index={i}
                    ref={el => { if (el) mediaRefs.current[i] = el; }}
                    className="relative border border-neutral-700 rounded overflow-hidden min-h-24 flex items-center justify-center bg-black"
                  >
                    {!url && !error && !loading && (
                      <div className="text-xs px-2 py-1 text-neutral-400">Đang chờ hiển thị...</div>
                    )}
                    {loading && <div className="text-neutral-400 text-xs p-2">Đang lấy link...</div>}
                    {error && <div className="text-red-400 text-xs p-2">Lỗi video</div>}
                    {url && <video src={url} controls className="w-full max-h-60" />}
                  </div>
                );
              }
              if (m.type === 'audio') {
                return (
                  <div
                    key={i}
                    data-media-index={i}
                    ref={el => { if (el) mediaRefs.current[i] = el; }}
                    className="p-2 border border-neutral-700 rounded flex items-center gap-2 bg-neutral-800"
                  >
                    {!url && !error && !loading && <span className="text-xs text-neutral-400">Đang chờ tải...</span>}
                    {loading && <span className="text-neutral-400 text-xs">Đang lấy...</span>}
                    {error && <span className="text-red-400 text-xs">Lỗi audio</span>}
                    {url && <audio controls src={url} className="w-full" />}
                  </div>
                );
              }
              return (
                <div key={i} className="p-2 border border-neutral-700 rounded text-xs break-all">{m.key}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
