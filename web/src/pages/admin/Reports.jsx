import React, { useEffect, useState } from "react";
import { adminApi } from "../../utils/api.js";
import { useAuth } from "../../state/auth.jsx";

export default function Reports() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("OPEN");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await adminApi.listReports({ status, type: type || undefined }, token);
      setItems(res.data.data || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type, token]);

  const act = async (id, action) => {
    try {
      await adminApi.resolveReport(id, action, undefined, token);
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm">Trạng thái</label>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="px-2 py-1 rounded border bg-[var(--panel)] border-[var(--panel-border)]">
          <option value="OPEN">OPEN</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <label className="text-sm ml-4">Loại</label>
        <select value={type} onChange={(e)=>setType(e.target.value)} className="px-2 py-1 rounded border bg-[var(--panel)] border-[var(--panel-border)]">
          <option value="">Tất cả</option>
          <option value="thread">Thread</option>
          <option value="comment">Comment</option>
          <option value="user">User</option>
        </select>
      </div>

      {err && <div className="text-red-500 card p-3">{err}</div>}
      {loading && <div className="card p-3">Đang tải...</div>}

      <div className="card p-4 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Loại</th>
              <th className="p-2">Lý do</th>
              <th className="p-2">Chi tiết</th>
              <th className="p-2">Người báo cáo</th>
              <th className="p-2">Trạng thái</th>
              <th className="p-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r)=> (
              <tr key={r._id} className="border-t border-[var(--panel-border)]">
                <td className="p-2">{r.type}</td>
                <td className="p-2">{r.reason}</td>
                <td className="p-2 muted">{r.details || '-'}</td>
                <td className="p-2">{r.createdBy?.username || r.createdBy}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 space-x-2">
                  {r.status === 'OPEN' ? (
                    <>
                      <button className="px-2 py-1 rounded bg-green-600/80 text-white" onClick={()=>act(r._id, 'RESOLVED')}>Đã xử lý</button>
                      <button className="px-2 py-1 rounded bg-yellow-600/80 text-white" onClick={()=>act(r._id, 'REJECTED')}>Từ chối</button>
                    </>
                  ) : (
                    <span className="muted text-xs">{r.handledBy?.username ? `by ${r.handledBy.username}` : ''}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !loading && <div className="p-3">Không có báo cáo.</div>}
      </div>
    </div>
  );
}
