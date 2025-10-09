import React, { useState } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../state/auth.jsx';

export default function ThreadComposer({ onCreated }){
  const { token } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]); // File[]
  const [progress, setProgress] = useState(0); // 0-100
  const [error, setError] = useState('');

  const onSelect = (e) => {
    const list = Array.from(e.target.files || []);
    // Limit to 6 like backend
    const merged = [...files, ...list].slice(0,6);
    setFiles(merged);
  };

  const removeFile = (idx) => setFiles(fs => fs.filter((_,i)=>i!==idx));

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
            xhr.open('POST', (import.meta.env.VITE_API_URL || 'http://localhost:3000/api') + '/threads');
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
    <form onSubmit={submit} className="rounded-lg p-4 space-y-3 card">
  <textarea value={text} onChange={e=>setText(e.target.value)} maxLength={500} rows={3} placeholder="Bạn đang nghĩ gì?" className="w-full resize-none bg-white border border-neutral-200 focus:ring-2 focus:ring-[color:var(--accent)] rounded p-3" />
      <div>
  <input multiple onChange={onSelect} type="file" accept="image/*,video/*,audio/*" className="text-xs" />
        {files.length>0 && (
          <div className="mt-2 grid gap-2" style={{gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))'}}>
            {files.map((f,i)=>{
              const url = URL.createObjectURL(f);
              const type = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'other';
              return (
                <div key={i} className="relative group rounded overflow-hidden border border-neutral-200 p-1 flex items-center justify-center bg-white">
                  {type==='image' && <img src={url} alt={f.name} className="object-cover w-full h-16" />}
                  {type==='video' && <video src={url} className="w-full h-16 object-cover" muted />}
                  {type==='audio' && <span className="text-[10px] text-neutral-300 truncate">🎵 {f.name}</span>}
                  <button type="button" onClick={()=>removeFile(i)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] opacity-0 group-hover:opacity-100">×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {files.length>0 && loading && (
  <div className="w-full h-2 bg-neutral-200 rounded overflow-hidden">
          <div className="h-full bg-violet-600 transition-all" style={{width: progress+'%'}} />
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{text.length}/500</span>
  <button disabled={loading || (!text.trim() && files.length===0)} className="px-4 py-1.5 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-40 font-medium text-sm text-white">Đăng</button>
      </div>
    </form>
  );
}
