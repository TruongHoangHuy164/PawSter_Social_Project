import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../state/auth.jsx';
import { dmApi } from '../../utils/api.js';
import { useSocket } from '../../state/socket.jsx';
import Avatar from '../../ui/Avatar.jsx';
import AudioWave from './AudioWave.jsx';
import CallModal from '../../ui/CallModal.jsx';
import IncomingCallModal from '../../ui/IncomingCallModal.jsx';

export default function Messages(){
  const { token, user } = useAuth();
  const { socket, connected } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('');
  const [rec, setRec] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const recordTimerRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadPct, setUploadPct] = useState(0);
  const listRef = useRef(null);
  const idsRef = useRef(new Set()); // chống trùng lặp message theo _id
  const [callOpen, setCallOpen] = useState(false);
  const [callMode, setCallMode] = useState('caller');
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [incomingVisible, setIncomingVisible] = useState(false);

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
    const onOffer = ({ conversationId: cid, fromUserId, sdp }) => {
      if (String(cid) !== String(active?._id)) return;
      // Hiện modal Accept/Decline trước khi mở CallModal
      setIncomingOffer({ sdp, fromUserId });
      setIncomingVisible(true);
    };
    socket.on('call:offer', onOffer);
    return ()=>{ socket.off('dm:new_message', onNew); socket.off('call:offer', onOffer); };
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
    if ((!input.trim() && !audioBlob && !attachmentFile) || !active) return;
    try{
      const otherId = (active.participants||[]).find(p=> String(p._id)!==String(user?._id))?._id;
      let res;
      if (audioBlob || attachmentFile) {
        const fd = new FormData();
        fd.append('to', otherId);
        if (input) fd.append('content', input);
        if (attachmentFile) {
          // Preserve original filename and mimetype for generic attachments
          fd.append('media', attachmentFile);
        }
        if (audioBlob) {
          // Recorded audio blob
          fd.append('media', new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }));
        }
        // Use XHR to track progress
        res = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `/api/messages/conversations/${active._id}/messages`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadPct(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            try {
              const json = JSON.parse(xhr.responseText || '{}');
              if (xhr.status >= 200 && xhr.status < 300) resolve({ data: json });
              else reject(new Error(json?.message || 'Gửi tin nhắn thất bại'));
            } catch (err) { reject(err); }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(fd);
        });
      } else {
        res = await dmApi.send(
          active._id,
          { to: otherId, content: input },
          token
        );
      }
      const msg = res.data.data;
      if (audioBlob && Array.isArray(msg.media)) {
        // Temp URL for recorded audio so it can play immediately
        const localUrl = URL.createObjectURL(audioBlob);
        msg.media = msg.media.map(mm => mm.type === 'audio' && !mm.url ? { ...mm, url: localUrl } : mm);
      }
      if (attachmentFile && Array.isArray(msg.media)) {
        // Temp URL for attached file (image/video/other) so it can show immediately
        const localUrl = attachmentPreviewUrl;
        const mime = attachmentFile.type || '';
        const t = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'other';
        msg.media = msg.media.map(mm => mm.type === t && !mm.url ? { ...mm, url: localUrl } : mm);
      }
      const id = String(msg._id);
      if (!idsRef.current.has(id)) {
        idsRef.current.add(id);
        setMessages(prev=>[...prev, msg]);
      }
      setInput('');
      setAudioBlob(null);
      setPreviewUrl('');
      setAttachmentFile(null);
      if (attachmentPreviewUrl) { try { URL.revokeObjectURL(attachmentPreviewUrl); } catch {} }
      setAttachmentPreviewUrl('');
      setUploadPct(0);
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
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-80px)] min-h-0 overflow-hidden">
  <aside className="col-span-5 md:col-span-4 lg:col-span-3 p-2 rounded-2xl bg-white dark:bg-black border border-black/10 dark:border-white/10 flex flex-col h-full min-h-0">
        <div className="font-semibold mb-2">Hội thoại</div>
        <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1">
          {conversations.map(c=>{
            const other = (c.participants||[]).find(p=> String(p._id) !== String(user?._id)) || {};
            return (
              <button key={c._id} onClick={()=>setActive(c)} className={`w-full flex items-center gap-3 px-2 py-2 rounded-2xl text-left hover:bg-black/5 dark:hover:bg-white/5 ${active?._id===c._id?'bg-black/5 dark:bg-white/5':''}`}>
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
  <section className="col-span-7 md:col-span-8 lg:col-span-9 flex flex-col h-full min-h-0 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black overflow-hidden">
        {!active ? (
          <div className="m-auto text-sm text-muted">Chọn một hội thoại để bắt đầu</div>
        ) : (
          <>
            <header className="px-3 py-2 border-b flex items-center gap-3" style={{borderColor:'var(--panel-border)'}}>
              {(() => { const other = (active.participants||[]).find(p=> String(p._id) !== String(user?._id)) || {}; return (
                <>
                  <Avatar user={{ username: other.username, avatarUrl: other.avatarUrl }} size="sm" />
                  <div className="text-sm font-medium">{other.username || 'Người dùng'}</div>
                  <div className="ml-auto flex items-center gap-2">
                    <button className="px-2 py-1 rounded-xl border" title="Gọi video" onClick={()=>{ setCallMode('caller'); setIncomingOffer(null); setCallOpen(true); }}>📹</button>
                  </div>
                </>
              );})()}
            </header>
            <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              {messages.map(m=>{
                const mine = String(m.from) === String(user?._id) || String(m.from?._id) === String(user?._id);
                if (mine) {
                  return (
                    <div key={m._id} className="flex justify-end">
                      <div className="max-w-[70%] px-3 py-2 rounded-2xl ml-auto text-white bg-black dark:bg-white dark:text-black">
                        <div className="space-y-2">
                          {m.content ? (<div>{m.content}</div>) : null}
                          {Array.isArray(m.media) && m.media.map((mm, idx) => {
                            if (mm.type === 'audio') return <AudioWave key={idx} url={mm.url} />;
                            if (mm.type === 'image') return <img key={idx} src={mm.url} alt="image" className="rounded-lg max-h-64 object-contain" />;
                            if (mm.type === 'video') return <video key={idx} src={mm.url} controls className="rounded-lg max-h-64" />;
                            return (
                              <a key={idx} href={mm.url} target="_blank" rel="noreferrer" className="text-xs underline break-all">
                                {mm.url ? 'Tải tệp' : '[tệp]'}
                              </a>
                            );
                          })}
                        </div>
                        <div className="text-[10px] text-white/70 mt-1 text-right">{formatAgo(m.createdAt)}</div>
                      </div>
                    </div>
                  );
                }
                const other = (active.participants||[]).find(p=> String(p._id) !== String(user?._id)) || {};
                return (
                  <div key={m._id} className="flex items-end gap-2">
                    <Avatar user={{ username: other.username, avatarUrl: other.avatarUrl }} size="sm" />
                    <div className="max-w-[70%] px-3 py-2 rounded-2xl bg-black/5 dark:bg-white/5">
                      <div className="space-y-2">
                        {m.content ? (<div>{m.content}</div>) : null}
                        {Array.isArray(m.media) && m.media.map((mm, idx) => {
                          if (mm.type === 'audio') return <AudioWave key={idx} url={mm.url} />;
                          if (mm.type === 'image') return <img key={idx} src={mm.url} alt="image" className="rounded-lg max-h-64 object-contain" />;
                          if (mm.type === 'video') return <video key={idx} src={mm.url} controls className="rounded-lg max-h-64" />;
                          return (
                            <a key={idx} href={mm.url} target="_blank" rel="noreferrer" className="text-xs underline break-all">
                              {mm.url ? 'Tải tệp' : '[tệp]'}
                            </a>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-muted mt-1">{formatAgo(m.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="p-2 border-t flex items-center gap-2 border-black/10 dark:border-white/10">
              <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-transparent border border-black/10 dark:border-white/10" placeholder="Nhập tin nhắn..." />
              <input type="file" className="hidden" id="file-input" onChange={e=>{
                const f = e.target.files?.[0];
                if (f) {
                  setAttachmentFile(f);
                  try { const u = URL.createObjectURL(f); setAttachmentPreviewUrl(u); } catch {}
                }
              }} />
              <button type="button" className="px-2 py-2 rounded-xl border" onClick={()=>document.getElementById('file-input').click()} title="Đính kèm tệp" disabled={uploadPct>0 && uploadPct<100}>📎</button>
              <button type="button" className={`px-2 py-2 rounded-xl border ${recording? 'bg-red-500 text-white' : ''}`} onClick={async ()=>{
                if (recording) {
                  rec?.stop();
                  if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
                } else {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                    const chunks = [];
                    mediaRecorder.ondataavailable = (e)=>{ if (e.data.size > 0) chunks.push(e.data); };
                    mediaRecorder.onstop = ()=>{
                      const blob = new Blob(chunks, { type: 'audio/webm' });
                      setAudioBlob(blob);
                      try { const u = URL.createObjectURL(blob); setPreviewUrl(u); } catch {}
                      setRecording(false);
                      stream.getTracks().forEach(t=>t.stop());
                    };
                    setRec(mediaRecorder);
                    setRecording(true);
                    setRecordSec(0);
                    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
                    recordTimerRef.current = setInterval(()=>setRecordSec(s=>s+1), 1000);
                    mediaRecorder.start();
                  } catch (err) { console.error(err); }
                }
              }} title={recording? 'Dừng ghi âm' : 'Ghi âm tin nhắn'}>
                {recording ? '⏹️' : '🎙️'}
              </button>
              {recording && (
                <span className="text-xs text-red-500 font-medium">Đang ghi: {String(Math.floor(recordSec/60)).padStart(2,'0')}:{String(recordSec%60).padStart(2,'0')}</span>
              )}
              {previewUrl && !recording && (
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg">
                  <AudioWave url={previewUrl} height={36} />
                  <button type="button" className="text-xs px-2 py-1 rounded border" onClick={()=>{ setAudioBlob(null); if (previewUrl) { try{ URL.revokeObjectURL(previewUrl);}catch{} } setPreviewUrl(''); setRecordSec(0); }}>
                    Xóa
                  </button>
                </div>
              )}
              {attachmentFile && !recording && (
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg">
                  {attachmentFile.type?.startsWith('audio/') ? (
                    <AudioWave url={attachmentPreviewUrl} height={36} />
                  ) : (
                    <div className="text-xs truncate max-w-[180px]" title={attachmentFile.name}>📎 {attachmentFile.name}</div>
                  )}
                  <button type="button" className="text-xs px-2 py-1 rounded border" onClick={()=>{ setAttachmentFile(null); if (attachmentPreviewUrl) { try{ URL.revokeObjectURL(attachmentPreviewUrl);}catch{} } setAttachmentPreviewUrl(''); }}>
                    Xóa
                  </button>
                </div>
              )}
              <button type="submit" disabled={uploadPct>0 && uploadPct<100} className="px-4 py-2 rounded-xl text-white bg-black dark:bg-white dark:text-black disabled:opacity-60">{uploadPct>0 && uploadPct<100 ? `Đang gửi ${uploadPct}%` : 'Gửi'}</button>
            </form>
            {uploadPct>0 && uploadPct<100 && (
              <div className="mx-2 mb-2 h-1 rounded bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-black dark:bg-white" style={{ width: `${uploadPct}%` }} />
              </div>
            )}
            {active && (
              <CallModal
                isOpen={callOpen}
                onClose={()=>{ setCallOpen(false); setIncomingOffer(null); setCallMode('caller'); }}
                conversationId={active._id}
                selfUserId={user?._id}
                otherUserId={(active.participants||[]).find(p=> String(p._id)!==String(user?._id))?._id}
                mode={callMode}
                remoteOffer={incomingOffer?.sdp || null}
              />
            )}
            {incomingVisible && active && (
              <IncomingCallModal
                isOpen={incomingVisible}
                callerUser={(active.participants||[]).find(p=> String(p._id)===String(incomingOffer?.fromUserId))}
                onDecline={()=>{ try{ socket?.emit('call:hangup', { toUserId: incomingOffer?.fromUserId, conversationId: active._id }); }catch{} setIncomingVisible(false); setIncomingOffer(null); }}
                onAccept={()=>{ setIncomingVisible(false); setCallMode('callee'); setCallOpen(true); }}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
