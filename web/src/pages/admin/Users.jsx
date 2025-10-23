import React, { useEffect, useState } from "react";
import { api, adminApi } from "../../utils/api.js";
import { useAuth } from "../../state/auth.jsx";

export default function Users() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("30d");
  const [view, setView] = useState("list"); // 'list' or 'stats'
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const load = async () => {
    try {
      const res = await adminApi.listUsers({ q, role: role || undefined, status: status || undefined }, token);
      setItems(res.data.data);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get(`/admin/users/stats?period=${period}`, token);
      setStats(res.data.data);
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, q, role, status]);

  useEffect(() => {
    if (view === "stats") {
      loadStats();
    }
  }, [view, period, token]);

  const update = async (id, patch) => {
    try {
      await adminApi.updateUser(id, patch, token);
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const lockUser = async (id) => {
    const hoursStr = prompt("Khoá bao lâu (giờ)? Để trống = 24h", "24");
    const hours = hoursStr ? Number(hoursStr) : 24;
    const reason = prompt("Lý do khoá?", "Vi phạm chính sách");
    try {
      await adminApi.lockUser(id, { hours, reason }, token);
      await load();
    } catch (e) { alert(e.message); }
  };

  const unlockUser = async (id) => {
    try {
      await adminApi.unlockUser(id, token);
      await load();
    } catch (e) { alert(e.message); }
  };

  const warnUser = async (id) => {
    const message = prompt("Nội dung cảnh cáo:");
    if (!message) return;
    try {
      await adminApi.warnUser(id, message, token);
      await load();
    } catch (e) { alert(e.message); }
  };

  const resetPassword = async (id) => {
    const newPassword = prompt("Mật khẩu mới (>=6 ký tự):");
    if (!newPassword) return;
    try {
      await adminApi.resetPassword(id, newPassword, token);
      alert("Đã đặt lại mật khẩu");
    } catch (e) { alert(e.message); }
  };

  // Calculate max for chart scaling
  const maxValue =
    stats?.stats.reduce((max, item) => Math.max(max, item.total), 0) || 1;

  return (
    <div className="space-y-4">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-lg font-medium transition border ${
              view === "list"
                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                : "bg-[var(--panel)] hover:bg-[var(--card-hover)] border-[var(--panel-border)]"
            }`}
          >
            📋 Danh sách
          </button>
          <button
            onClick={() => setView("stats")}
            className={`px-4 py-2 rounded-lg font-medium transition border ${
              view === "stats"
                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                : "bg-[var(--panel)] hover:bg-[var(--card-hover)] border-[var(--panel-border)]"
            }`}
          >
            📊 Thống kê
          </button>
        </div>
      </div>

      {err && <div className="text-red-500 p-4 card">{err}</div>}

      {/* Stats View */}
      {view === "stats" && (
        <div className="space-y-4">
          {/* Period Filter */}
          <div className="flex gap-2">
            {["7d", "30d", "90d", "12m"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition border ${
                  period === p
                    ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                    : "bg-[var(--panel)] hover:bg-[var(--card-hover)] border-[var(--panel-border)]"
                }`}
              >
                {p === "7d" && "7 ngày"}
                {p === "30d" && "30 ngày"}
                {p === "90d" && "90 ngày"}
                {p === "12m" && "12 tháng"}
              </button>
            ))}
          </div>

          {/* Summary Cards */}
          {stats?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card p-4 border-l-4 border-black/10 dark:border-white/10">
                <div className="text-sm muted mb-1">Tổng người dùng</div>
                <div className="text-2xl font-bold">
                  {stats.summary.total.toLocaleString()}
                </div>
              </div>
              <div className="card p-4 border-l-4 border-black/10 dark:border-white/10">
                <div className="text-sm muted mb-1">
                  Người dùng Pro
                </div>
                <div className="text-2xl font-bold">
                  {stats.summary.pro.toLocaleString()}
                </div>
                <div className="text-xs muted mt-1">
                  {((stats.summary.pro / stats.summary.total) * 100).toFixed(1)}
                  %
                </div>
              </div>
              <div className="card p-4 border-l-4 border-black/10 dark:border-white/10">
                <div className="text-sm muted mb-1">
                  Người dùng Free
                </div>
                <div className="text-2xl font-bold">
                  {stats.summary.free.toLocaleString()}
                </div>
                <div className="text-xs muted mt-1">
                  {((stats.summary.free / stats.summary.total) * 100).toFixed(
                    1
                  )}
                  %
                </div>
              </div>
              <div className="card p-4 border-l-4 border-black/10 dark:border-white/10">
                <div className="text-sm muted mb-1">Mới ({period})</div>
                <div className="text-2xl font-bold">
                  {stats.summary.new.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          {stats?.stats && stats.stats.length > 0 && (
            <>
              {/* Line Chart - Growth Trend */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">
                  📈 Xu hướng tăng trưởng
                </h3>

                <div className="relative" style={{ height: "250px" }}>
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs muted">
                    <span>{maxValue}</span>
                    <span>{Math.floor(maxValue * 0.75)}</span>
                    <span>{Math.floor(maxValue * 0.5)}</span>
                    <span>{Math.floor(maxValue * 0.25)}</span>
                    <span>0</span>
                  </div>

                  {/* Grid lines */}
                  <div className="absolute left-16 right-0 top-0 bottom-8 flex flex-col justify-between">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="border-t border-[var(--panel-border)]"
                      ></div>
                    ))}
                  </div>

                  {/* Line Chart SVG */}
                  <svg
                    className="absolute left-16 right-0 top-0 bottom-8"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{
                      width: "calc(100% - 4rem)",
                      height: "calc(100% - 2rem)",
                    }}
                  >
                    {stats.stats.length > 1 && (
                      <>
                        {/* Total users line */}
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          className="text-black dark:text-white"
                          strokeWidth="0.5"
                          vectorEffect="non-scaling-stroke"
                          points={stats.stats
                            .map((item, i) => {
                              const x = (i / (stats.stats.length - 1)) * 100;
                              const y = 100 - (item.total / maxValue) * 100;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />

                        {/* Pro users line */}
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          className="text-black/50 dark:text-white/50"
                          strokeWidth="0.3"
                          strokeDasharray="2,2"
                          vectorEffect="non-scaling-stroke"
                          points={stats.stats
                            .map((item, i) => {
                              const x = (i / (stats.stats.length - 1)) * 100;
                              const y = 100 - (item.pro / maxValue) * 100;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />

                        {/* Free users line */}
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          className="text-black/30 dark:text-white/40"
                          strokeWidth="0.3"
                          strokeDasharray="2,2"
                          vectorEffect="non-scaling-stroke"
                          points={stats.stats
                            .map((item, i) => {
                              const x = (i / (stats.stats.length - 1)) * 100;
                              const y = 100 - (item.free / maxValue) * 100;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />

                        {/* Data points */}
                         {stats.stats.map((item, i) => {
                          const x = (i / (stats.stats.length - 1)) * 100;
                          const y = 100 - (item.total / maxValue) * 100;
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="0.8"
                              fill="currentColor"
                              className="text-black dark:text-white cursor-pointer"
                            />
                          );
                        })}
                      </>
                    )}
                  </svg>

                  {/* X-axis labels */}
                  <div className="absolute left-16 right-0 bottom-0 flex justify-between gap-1">
                    {stats.stats.map((item, index) => {
                      // Only show every nth label to avoid crowding
                      const showLabel =
                        stats.stats.length <= 14 ||
                        index % Math.ceil(stats.stats.length / 7) === 0 ||
                        index === stats.stats.length - 1;
                      return showLabel ? (
                        <div
                          key={index}
                          className="text-xs muted"
                          style={{ width: "30px", textAlign: "center" }}
                        >
                          {period === "12m"
                            ? item.date.substring(5, 7)
                            : item.date.substring(5)}
                        </div>
                      ) : (
                        <div key={index} style={{ width: "30px" }}></div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-6 justify-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-black dark:bg-white"></div>
                    <span className="text-sm">Tổng người dùng</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-black/50 dark:bg-white/50" style={{ borderTop: "2px dashed" }}></div>
                    <span className="text-sm">Pro Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-black/30 dark:bg-white/40" style={{ borderTop: "2px dashed" }}></div>
                    <span className="text-sm">Free Users</span>
                  </div>
                </div>
              </div>

              {/* Pie Chart + Bar Chart Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pie Chart - Pro vs Free */}
                {stats?.summary && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      🥧 Phân bố người dùng
                    </h3>

                    <div
                      className="flex items-center justify-center"
                      style={{ height: "250px" }}
                    >
                      <svg width="200" height="200" viewBox="0 0 200 200">
                        {(() => {
                          const total = stats.summary.total;
                          const proPercent = (stats.summary.pro / total) * 100;
                          const freePercent =
                            (stats.summary.free / total) * 100;

                          // Calculate pie slices
                          const proAngle = (proPercent / 100) * 360;
                          const freeAngle = (freePercent / 100) * 360;

                          const getCoordinates = (angle) => {
                            const rad = (angle - 90) * (Math.PI / 180);
                            return {
                              x: 100 + 90 * Math.cos(rad),
                              y: 100 + 90 * Math.sin(rad),
                            };
                          };

                          const proEnd = getCoordinates(proAngle);
                          const freeEnd = getCoordinates(proAngle + freeAngle);

                          return (
                            <g>
                              {/* Pro slice */}
                              <path
                                d={`M 100 100 L 100 10 A 90 90 0 ${
                                  proAngle > 180 ? 1 : 0
                                } 1 ${proEnd.x} ${proEnd.y} Z`}
                                className="fill-current text-black/80 dark:text-white/80 hover:opacity-80 transition-opacity cursor-pointer"
                              />

                              {/* Free slice */}
                              <path
                                d={`M 100 100 L ${proEnd.x} ${
                                  proEnd.y
                                } A 90 90 0 ${freeAngle > 180 ? 1 : 0} 1 ${
                                  freeEnd.x
                                } ${freeEnd.y} Z`}
                                className="fill-current text-black/40 dark:text-white/40 hover:opacity-80 transition-opacity cursor-pointer"
                              />

                              {/* Center circle for donut effect */}
                              <circle
                                cx="100"
                                cy="100"
                                r="50"
                                fill="var(--panel)"
                              />

                              {/* Center text */}
                              <text
                                x="100"
                                y="95"
                                textAnchor="middle"
                                className="text-xl font-bold fill-current"
                              >
                                {total.toLocaleString()}
                              </text>
                              <text
                                x="100"
                                y="110"
                                textAnchor="middle"
                                className="text-xs fill-current muted"
                              >
                                Tổng users
                              </text>

                              {/* Removed color gradients for monochrome style */}
                            </g>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Pie Legend */}
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-black/80 dark:bg-white/80"></div>
                          <span className="text-sm">Pro Users</span>
                        </div>
                        <div className="text-sm font-semibold">
                          {stats.summary.pro.toLocaleString()} (
                          {(
                            (stats.summary.pro / stats.summary.total) *
                            100
                          ).toFixed(1)}
                          %)
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-black/40 dark:bg-white/40"></div>
                          <span className="text-sm">Free Users</span>
                        </div>
                        <div className="text-sm font-semibold">
                          {stats.summary.free.toLocaleString()} (
                          {(
                            (stats.summary.free / stats.summary.total) *
                            100
                          ).toFixed(1)}
                          %)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bar Chart */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    📊 Biểu đồ cột - Đăng ký theo ngày
                  </h3>

                  {/* Chart Container */}
                  <div className="relative" style={{ height: "250px" }}>
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs muted">
                      <span>{maxValue}</span>
                      <span>{Math.floor(maxValue * 0.75)}</span>
                      <span>{Math.floor(maxValue * 0.5)}</span>
                      <span>{Math.floor(maxValue * 0.25)}</span>
                      <span>0</span>
                    </div>

                    {/* Grid lines */}
                    <div className="absolute left-16 right-0 top-0 bottom-8 flex flex-col justify-between">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="border-t border-[var(--panel-border)]"
                        ></div>
                      ))}
                    </div>

                    {/* Bars Container */}
                    <div className="absolute left-16 right-0 top-0 bottom-8 flex items-end justify-between gap-1 px-2">
                      {stats.stats.map((item, index) => {
                        const height = (item.total / maxValue) * 100;

                        return (
                          <div
                            key={index}
                            className="flex-1 relative group"
                            style={{ height: "100%" }}
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="card p-3 shadow-lg text-xs whitespace-nowrap">
                                <div className="font-semibold mb-1">
                                  {item.date}
                                </div>
                                <div>Tổng: {item.total}</div>
                                <div className="muted">
                                  Pro: {item.pro}
                                </div>
                                <div className="muted">
                                  Free: {item.free}
                                </div>
                              </div>
                            </div>

                            {/* Bar */}
                            <div
                              className="absolute bottom-0 w-full rounded-t overflow-hidden cursor-pointer transition-all hover:opacity-80"
                              style={{ height: `${height}%` }}
                            >
                              {/* Free users (bottom) */}
                              <div
                                className="absolute bottom-0 w-full bg-black/30 dark:bg-white/30"
                                style={{
                                  height: `${(item.free / item.total) * 100}%`,
                                }}
                              />
                              {/* Pro users (top) */}
                              <div
                                className="absolute top-0 w-full bg-black/70 dark:bg-white/70"
                                style={{
                                  height: `${(item.pro / item.total) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* X-axis labels */}
                    <div className="absolute left-16 right-0 bottom-0 flex justify-between gap-1 px-2">
                      {stats.stats.map((item, index) => (
                        <div key={index} className="flex-1 text-center">
                          <div className="text-xs muted truncate">
                            {period === "12m"
                              ? item.date.substring(5, 7)
                              : item.date.substring(5)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 mt-6 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-black/70 dark:bg-white/70" />
                      <span className="text-sm">Pro Users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-black/30 dark:bg-white/30" />
                      <span className="text-sm">Free Users</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Recent Users Table */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">
              👥 Người dùng mới nhất
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left muted border-b border-[var(--panel-border)]">
                    <th className="p-2">Tên</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Loại</th>
                    <th className="p-2">Ngày đăng ký</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 10).map((u) => (
                    <tr
                      key={u._id}
                      className="border-t border-[var(--panel-border)] hover:bg-[var(--card-hover)]"
                    >
                      <td className="p-2">{u.username}</td>
                      <td className="p-2 muted">{u.email}</td>
                      <td className="p-2">
                        {u.isPro ? (
                          <span className="px-2 py-1 rounded-full text-xs border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5">
                            💎 Pro
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs border border-black/15 dark:border-white/15">
                            Free
                          </span>
                        )}
                      </td>
                      <td className="p-2 muted">
                        {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="card p-4 overflow-auto space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo username/email..."
              className="px-3 py-2 rounded border bg-[var(--panel)] border-[var(--panel-border)] text-sm"
              style={{ minWidth: 240 }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 rounded border bg-[var(--panel)] border-[var(--panel-border)] text-sm"
            >
              <option value="">Tất cả vai trò</option>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded border bg-[var(--panel)] border-[var(--panel-border)] text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Active</option>
              <option value="locked">Locked</option>
            </select>
            <button
              onClick={load}
              className="ml-auto px-3 py-2 rounded border bg-black text-white dark:bg-white dark:text-black text-sm"
            >
              Làm mới
            </button>
          </div>

          {/* Table */}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">User</th>
                <th className="p-2">Email</th>
                <th className="p-2">Vai trò</th>
                <th className="p-2">Trạng thái</th>
                <th className="p-2">Pro</th>
                <th className="p-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr
                  key={u._id}
                  className="border-t border-[var(--panel-border)] hover:bg-[var(--card-hover)]"
                >
                  <td className="p-2">{u.username}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">
                    <select
                      value={u.role || (u.isAdmin ? "admin" : "user")}
                      onChange={(e) =>
                        update(u._id, {
                          role: e.target.value,
                          isAdmin: e.target.value === "admin",
                        })
                      }
                      className="px-2 py-1 rounded border bg-[var(--panel)] border-[var(--panel-border)]"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-2">
                    {u.status === "locked" || u.lockedUntil ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-600/10 border border-red-600/20 text-red-700 dark:text-red-400">
                        Locked
                        {u.lockedUntil
                          ? ` đến ${new Date(u.lockedUntil).toLocaleString("vi-VN")}`
                          : ""}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-600/10 border border-green-600/20 text-green-700 dark:text-green-400">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={!!u.isPro}
                      onChange={(e) => update(u._id, { isPro: e.target.checked })}
                    />
                  </td>
                  <td className="p-2 space-x-2">
                    {u.status === "locked" || u.lockedUntil ? (
                      <button
                        className="px-2 py-1 text-xs rounded bg-green-600/80 text-white"
                        onClick={() => unlockUser(u._id)}
                      >
                        Mở khoá
                      </button>
                    ) : (
                      <button
                        className="px-2 py-1 text-xs rounded bg-yellow-600/80 text-white"
                        onClick={() => lockUser(u._id)}
                      >
                        Khoá
                      </button>
                    )}
                    <button
                      className="px-2 py-1 text-xs rounded bg-orange-600/80 text-white"
                      onClick={() => warnUser(u._id)}
                    >
                      Cảnh cáo
                    </button>
                    <button
                      className="px-2 py-1 text-xs rounded bg-red-600/80 text-white"
                      onClick={() => resetPassword(u._id)}
                    >
                      Reset mật khẩu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
