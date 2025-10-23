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
      else if (action === 'reject') await api.post(`${path}/reject`, undefined, token);
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
        </div>
      </div>

      {err && <div className="text-red-500 card p-3">{err}</div>}
      {loading && <div className="card p-3">Đang tải...</div>}

      {tab === 'threads' && (
        <div className="space-y-2">
          {threads.map(t => (
            <div key={t._id} className="card p-4 flex gap-3 items-start">
              <div className="flex-1">
                <div className="text-sm mb-1"><b>{t.author?.username}</b> • <span className="muted">{new Date(t.createdAt).toLocaleString('vi-VN')}</span></div>
                <div className="whitespace-pre-wrap text-sm">{t.content}</div>
                {t.media?.length>0 && (
                  <div className="mt-2 text-xs muted">{t.media.length} media</div>
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
                <div className="text-sm mb-1"><b>{c.author?.username}</b> • <span className="muted">{new Date(c.createdAt).toLocaleString('vi-VN')}</span></div>
                <div className="text-xs muted">Trả lời bài của {c.threadId?.author?.username || '...'}</div>
                <div className="whitespace-pre-wrap text-sm mt-1">{c.content}</div>
                {c.media?.length>0 && (
                  <div className="mt-2 text-xs muted">{c.media.length} media</div>
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
