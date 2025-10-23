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
  const [selected, setSelected] = useState(null);

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
      let notes;
      if (action === 'RESOLVED' || action === 'REJECTED') {
        notes = prompt(action === 'RESOLVED' ? 'Ghi chú khi đánh dấu ĐÃ XỬ LÝ (tùy chọn):' : 'Lý do TỪ CHỐI (tùy chọn):') || undefined;
      }
      await adminApi.resolveReport(id, action, notes, token);
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
                  <button className="px-2 py-1 rounded border border-[var(--panel-border)]" onClick={()=>setSelected(r)}>Chi tiết</button>
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

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--panel)] border border-[var(--panel-border)] rounded-lg w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-[var(--panel-border)] flex items-center justify-between">
              <div>
                <div className="text-sm muted">Báo cáo • {selected.type}</div>
                <div className="font-semibold">{selected.reason}</div>
              </div>
              <button className="px-2 py-1 rounded border" onClick={()=>setSelected(null)}>Đóng</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="muted">Người báo cáo:</span> {selected.createdBy?.username || selected.createdBy}</div>
                <div><span className="muted">Trạng thái:</span> {selected.status}</div>
                <div><span className="muted">Target ID:</span> <code className="text-xs">{selected.targetId}</code></div>
                <div><span className="muted">Tạo lúc:</span> {new Date(selected.createdAt).toLocaleString('vi-VN')}</div>
              </div>
              {selected.details && (
                <div className="text-sm"><span className="muted">Chi tiết:</span> {selected.details}</div>
              )}

              {/* Actions */}
              {selected.status === 'OPEN' && (
                <div className="flex gap-2 pt-2">
                  <button className="px-3 py-1 rounded bg-green-600/80 text-white text-sm" onClick={()=>{ act(selected._id, 'RESOLVED'); setSelected(null); }}>Đánh dấu đã xử lý</button>
                  <button className="px-3 py-1 rounded bg-yellow-600/80 text-white text-sm" onClick={()=>{ act(selected._id, 'REJECTED'); setSelected(null); }}>Từ chối</button>
                </div>
              )}

              {/* History */}
              <div className="pt-2">
                <div className="font-medium mb-2">Lịch sử</div>
                {selected.history?.length ? (
                  <div className="space-y-2">
                    {selected.history.map((h, idx)=>(
                      <div key={idx} className="text-sm p-2 rounded border border-[var(--panel-border)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <b>{h.action}</b> {h.by?.username ? `• ${h.by.username}` : ''}
                          </div>
                          <div className="muted text-xs">{new Date(h.at).toLocaleString('vi-VN')}</div>
                        </div>
                        {h.notes && <div className="text-xs mt-1">{h.notes}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm muted">Chưa có lịch sử.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
