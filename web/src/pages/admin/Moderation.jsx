import React, { useEffect, useState } from "react";
import { api } from "../../utils/api.js";
import { useAuth } from "../../state/auth.jsx";

export default function Moderation() {
  const { token } = useAuth();
  const [tab, setTab] = useState("threads"); // threads | comments
  const [status, setStatus] = useState("FLAGGED");
  const [threads, setThreads] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [autoWarn, setAutoWarn] = useState(true);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      if (tab === "threads") {
        const res = await api.get(`/admin/moderation/threads?status=${status}`, token);
        setThreads(res.data.data || []);
      } else {
        const res = await api.get(`/admin/moderation/comments?status=${status}`, token);
        setComments(res.data.data || []);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status, token]);

  const act = async (type, id, action) => {
    try {
      const path = type === 'thread' ? `/admin/moderation/threads/${id}` : `/admin/moderation/comments/${id}`;
      if (action === 'approve') await api.post(`${path}/approve`, undefined, token);
      else if (action === 'reject') {
        const reason = prompt('Lý do từ chối? (tùy chọn)', 'Vi phạm chính sách nội dung');
        const doWarn = autoWarn ? true : confirm('Cộng 1 cảnh cáo cho tác giả?');
        const resp = await api.post(`${path}/reject`, { warn: doWarn, reason }, token);
        const user = resp?.data?.user;
        if (user) {
          alert(`Cảnh cáo hiện tại: ${user.warningsCount}. ${user.status==='locked' ? 'Tài khoản đã bị khoá.' : ''}`);
        }
      }
      else if (action === 'delete') await api.del(type === 'thread' ? `/admin/threads/${id}` : `${path}`, token);
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setTab('threads')} className={`px-3 py-1.5 rounded border ${tab==='threads'? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white':'bg-[var(--panel)] border-[var(--panel-border)]'}`}>📝 Threads</button>
        <button onClick={() => setTab('comments')} className={`px-3 py-1.5 rounded border ${tab==='comments'? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white':'bg-[var(--panel)] border-[var(--panel-border)]'}`}>💬 Comments</button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm">Trạng thái</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)} className="px-2 py-1 rounded border bg-[var(--panel)] border-[var(--panel-border)]">
            <option value="FLAGGED">FLAGGED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <label className="text-sm inline-flex items-center gap-1 ml-2">
            <input type="checkbox" checked={autoWarn} onChange={(e)=>setAutoWarn(e.target.checked)} />
            +1 cảnh cáo khi từ chối
          </label>
        </div>
      </div>

      {err && <div className="text-red-500 card p-3">{err}</div>}
      {loading && <div className="card p-3">Đang tải...</div>}

      {tab === 'threads' && (
        <div className="space-y-2">
          {threads.map(t => (
            <div key={t._id} className="card p-4 flex gap-3 items-start">
              <div className="flex-1">
                <div className="text-sm mb-2 flex items-center gap-2 flex-wrap">
                  <b>{t.author?.username}</b>
                  <span className="px-2 py-0.5 rounded-full text-xs border border-black/15 dark:border-white/20">{status}</span>
                  {typeof t.author?.warnings?.length === 'number' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-600/10 border border-yellow-600/20 text-yellow-700 dark:text-yellow-400">Cảnh cáo: {t.author.warnings.length}/5</span>
                  )}
                  {t.author?.status === 'locked' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-600/10 border border-red-600/20 text-red-700 dark:text-red-400">Đã khoá</span>
                  )}
                  <span className="muted">{new Date(t.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">{t.content}</div>
                {t.media?.length>0 && (
                  <MediaStrip type="thread" itemId={t._id} media={t.media} />
                )}
                {t.moderation?.labels?.length>0 && (
                  <div className="mt-2 text-xs">🏷️ {t.moderation.labels.join(', ')}</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button className="px-3 py-1 rounded bg-green-600/80 text-white text-sm" onClick={()=>act('thread', t._id, 'approve')}>Duyệt</button>
                <button className="px-3 py-1 rounded bg-yellow-600/80 text-white text-sm" onClick={()=>act('thread', t._id, 'reject')}>Từ chối</button>
                <button className="px-3 py-1 rounded bg-red-600/80 text-white text-sm" onClick={()=>act('thread', t._id, 'delete')}>Xoá</button>
              </div>
            </div>
          ))}
          {threads.length===0 && !loading && <div className="card p-4">Không có bài nào.</div>}
        </div>
      )}

      {tab === 'comments' && (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c._id} className="card p-4 flex gap-3 items-start">
              <div className="flex-1">
                <div className="text-sm mb-2 flex items-center gap-2 flex-wrap">
                  <b>{c.author?.username}</b>
                  <span className="px-2 py-0.5 rounded-full text-xs border border-black/15 dark:border-white/20">{status}</span>
                  {typeof c.author?.warnings?.length === 'number' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-600/10 border border-yellow-600/20 text-yellow-700 dark:text-yellow-400">Cảnh cáo: {c.author.warnings.length}/5</span>
                  )}
                  {c.author?.status === 'locked' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-600/10 border border-red-600/20 text-red-700 dark:text-red-400">Đã khoá</span>
                  )}
                  <span className="muted">{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="text-xs muted">Trả lời bài của {c.threadId?.author?.username || '...'}</div>
                <div className="whitespace-pre-wrap text-sm mt-1">{c.content}</div>
                {c.media?.length>0 && (
                  <MediaStrip type="comment" itemId={c._id} media={c.media} />
                )}
                {c.moderation?.labels?.length>0 && (
                  <div className="mt-2 text-xs">🏷️ {c.moderation.labels.join(', ')}</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button className="px-3 py-1 rounded bg-green-600/80 text-white text-sm" onClick={()=>act('comment', c._id, 'approve')}>Duyệt</button>
                <button className="px-3 py-1 rounded bg-yellow-600/80 text-white text-sm" onClick={()=>act('comment', c._id, 'reject')}>Từ chối</button>
                <button className="px-3 py-1 rounded bg-red-600/80 text-white text-sm" onClick={()=>act('comment', c._id, 'delete')}>Xoá</button>
              </div>
            </div>
          ))}
          {comments.length===0 && !loading && <div className="card p-4">Không có bình luận nào.</div>}
        </div>
      )}
    </div>
  );
}

function MediaStrip({ type, itemId, media }) {
  const { token } = useAuth();
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const limited = media.slice(0, 3);
        const results = await Promise.all(
          limited.map((m, i) =>
            m.type === 'image'
              ? api.get(`/media/${type}/${itemId}/${i}`, token).catch(() => null)
              : Promise.resolve(null)
          )
        );
        if (!mounted) return;
        setUrls(results.map((r) => r?.data?.data?.url || null));
      } catch (e) {
        // ignore
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [type, itemId, media, token]);

  if (!media?.length) return null;

  return (
    <div className="mt-2 flex gap-2 items-center flex-wrap">
      {media.slice(0, 3).map((m, i) => (
        <div key={i} className="w-20 h-20 rounded overflow-hidden bg-[var(--panel)] border border-[var(--panel-border)] flex items-center justify-center text-xs">
          {m.type === 'image' && urls[i] ? (
            <img src={urls[i]} alt="media" className="w-full h-full object-cover" />
          ) : m.type === 'video' ? (
            <span>🎬 video</span>
          ) : m.type === 'audio' ? (
            <span>🎵 audio</span>
          ) : (
            <span>file</span>
          )}
        </div>
      ))}
      {media.length > 3 && (
        <span className="text-xs muted">+{media.length - 3} nữa</span>
      )}
    </div>
  );
}
