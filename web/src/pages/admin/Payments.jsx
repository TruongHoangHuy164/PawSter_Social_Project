import React, { useEffect, useState } from "react";
import { api } from "../../utils/api.js";
import { useAuth } from "../../state/auth.jsx";

export default function Payments() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState("list"); // 'list' or 'stats'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (view === "list") {
      (async () => {
        try {
          const res = await api.get("/admin/payments", token);
          setItems(res.data.data);
        } catch (e) {
          setErr(e.message);
        }
      })();
    } else if (view === "stats") {
      (async () => {
        try {
          const res = await api.get(
            `/admin/payments/stats?year=${selectedYear}`,
            token
          );
          setStats(res.data.data);
          setErr("");
        } catch (e) {
          setErr(e.message);
        }
      })();
    }
  }, [token, view, selectedYear]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getMonthName = (month) => {
    const months = [
      "Tháng 1",
      "Tháng 2",
      "Tháng 3",
      "Tháng 4",
      "Tháng 5",
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
      "Tháng 12",
    ];
    return months[month - 1];
  };

  const renderStats = () => {
    if (!stats) return <div className="p-4">Đang tải...</div>;

    const maxAmount = Math.max(...stats.monthly.map((m) => m.paid.amount), 1);

    // Calculate success rate
    const successRate =
      stats.summary.total.count > 0
        ? (
            (stats.summary.paid.count / stats.summary.total.count) *
            100
          ).toFixed(1)
        : 0;

    // Calculate average transaction value
    const avgTransaction =
      stats.summary.paid.count > 0
        ? stats.summary.paid.amount / stats.summary.paid.count
        : 0;

    return (
      <div className="space-y-6">
        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4 border-black/10 dark:border-white/10 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">
                  💰 Tổng doanh thu
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.summary.paid.amount)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.summary.total.count} giao dịch
                </div>
              </div>
              <div className="text-3xl opacity-20">💵</div>
            </div>
          </div>

          <div className="card p-4 border-l-4 border-black/10 dark:border-white/10 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm muted mb-1">
                  ✅ Tỉ lệ thành công
                </div>
                <div className="text-2xl font-bold">
                  {successRate}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.summary.paid.count} / {stats.summary.total.count}
                </div>
              </div>
              <div className="text-3xl opacity-20">📊</div>
            </div>
          </div>

          <div className="card p-4 border-l-4 border-black/10 dark:border-white/10 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm muted mb-1">
                  💳 Giao dịch TB
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(avgTransaction)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Trung bình/giao dịch
                </div>
              </div>
              <div className="text-3xl opacity-20">💎</div>
            </div>
          </div>

          <div className="card p-4 border-l-4 border-black/10 dark:border-white/10 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm muted mb-1">⚠️ Cần xử lý</div>
                <div className="text-2xl font-bold">
                  {stats.summary.pending.count + stats.summary.failed.count}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.summary.pending.count} chờ •{" "}
                  {stats.summary.failed.count} lỗi
                </div>
              </div>
              <div className="text-3xl opacity-20">⏳</div>
            </div>
          </div>
        </div>

        {/* Line Chart - Revenue Trend */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            📈 Xu hướng doanh thu theo tháng
          </h3>
          <div className="relative" style={{ height: "300px" }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-20 flex flex-col justify-between text-xs text-gray-500">
              <span>{formatCurrency(maxAmount)}</span>
              <span>{formatCurrency(maxAmount * 0.75)}</span>
              <span>{formatCurrency(maxAmount * 0.5)}</span>
              <span>{formatCurrency(maxAmount * 0.25)}</span>
              <span>0đ</span>
            </div>

            {/* Grid lines */}
            <div className="absolute left-20 right-0 top-0 bottom-8 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-[var(--panel-border)]"></div>
              ))}
            </div>

            {/* Line Chart SVG */}
            <svg
              className="absolute left-20 right-0 top-0 bottom-8"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                width: "calc(100% - 5rem)",
                height: "calc(100% - 2rem)",
              }}
            >
              {/* Removed blue gradient for monochrome style */}

              {stats.monthly.length > 1 && (
                <>
                  {/* Area under line */}
                  <polygon
                    className="fill-current text-black/5 dark:text-white/5"
                    points={`0,100 ${stats.monthly
                      .map((month, i) => {
                        const x = (i / (stats.monthly.length - 1)) * 100;
                        const y = 100 - (month.paid.amount / maxAmount) * 100;
                        return `${x},${y}`;
                      })
                      .join(" ")} 100,100`}
                  />

                  {/* Paid amount line */}
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    className="text-black dark:text-white"
                    strokeWidth="0.8"
                    vectorEffect="non-scaling-stroke"
                    points={stats.monthly
                      .map((month, i) => {
                        const x = (i / (stats.monthly.length - 1)) * 100;
                        const y = 100 - (month.paid.amount / maxAmount) * 100;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />

                  {/* Total amount line (dashed) */}
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    className="text-black/40 dark:text-white/40"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                    vectorEffect="non-scaling-stroke"
                    points={stats.monthly
                      .map((month, i) => {
                        const x = (i / (stats.monthly.length - 1)) * 100;
                        const y = 100 - (month.total.amount / maxAmount) * 100;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />

                  {/* Data points */}
                  {stats.monthly.map((month, i) => {
                    const x = (i / (stats.monthly.length - 1)) * 100;
                    const y = 100 - (month.paid.amount / maxAmount) * 100;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="1"
                        className="fill-current text-black dark:text-white cursor-pointer"
                      />
                    );
                  })}
                </>
              )}
            </svg>

            {/* X-axis labels */}
            <div className="absolute left-20 right-0 bottom-0 flex justify-between">
              {stats.monthly.map((month) => (
                <div
                  key={month.month}
                  className="flex-1 text-center text-xs text-gray-600"
                >
                  T{month.month}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-black dark:bg-white"></div>
              <span>Đã thanh toán</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-black/40 dark:bg-white/40" style={{ borderTop: "2px dashed" }}></div>
              <span>Tổng giao dịch</span>
            </div>
          </div>
        </div>

        {/* Charts Grid - Pie Chart & Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - Status Distribution */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">
              🥧 Phân bố trạng thái thanh toán
            </h3>
            <div
              className="flex items-center justify-center"
              style={{ height: "300px" }}
            >
              <svg width="220" height="220" viewBox="0 0 220 220">
                {/* Removed color gradients for monochrome style */}

                {(() => {
                  const total = stats.summary.total.count;
                  const paidPercent = (stats.summary.paid.count / total) * 100;
                  const pendingPercent =
                    (stats.summary.pending.count / total) * 100;
                  const failedPercent =
                    (stats.summary.failed.count / total) * 100;

                  let currentAngle = -90; // Start from top

                  const createArc = (percent, startAngle) => {
                    const angle = (percent / 100) * 360;
                    const endAngle = startAngle + angle;
                    const start = {
                      x: 110 + 80 * Math.cos((Math.PI * startAngle) / 180),
                      y: 110 + 80 * Math.sin((Math.PI * startAngle) / 180),
                    };
                    const end = {
                      x: 110 + 80 * Math.cos((Math.PI * endAngle) / 180),
                      y: 110 + 80 * Math.sin((Math.PI * endAngle) / 180),
                    };
                    const largeArc = angle > 180 ? 1 : 0;
                    return {
                      path: `M 110 110 L ${start.x} ${start.y} A 80 80 0 ${largeArc} 1 ${end.x} ${end.y} Z`,
                      endAngle,
                    };
                  };

                  const segments = [];

                  if (paidPercent > 0) {
                    const arc = createArc(paidPercent, currentAngle);
                    segments.push(
                      <path
                        key="paid"
                        d={arc.path}
                        className="fill-current text-black/70 dark:text-white/70 hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    );
                    currentAngle = arc.endAngle;
                  }

                  if (pendingPercent > 0) {
                    const arc = createArc(pendingPercent, currentAngle);
                    segments.push(
                      <path
                        key="pending"
                        d={arc.path}
                        className="fill-current text-black/40 dark:text-white/40 hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    );
                    currentAngle = arc.endAngle;
                  }

                  if (failedPercent > 0) {
                    const arc = createArc(failedPercent, currentAngle);
                    segments.push(
                      <path
                        key="failed"
                        d={arc.path}
                        className="fill-current text-black/20 dark:text-white/30 hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    );
                  }

                  return (
                    <>
                      {segments}
                      {/* Center hole for donut effect */}
                      <circle cx="110" cy="110" r="50" fill="var(--panel)" />
                      {/* Center text */}
                      <text
                        x="110"
                        y="105"
                        textAnchor="middle"
                        className="text-xs fill-gray-500"
                      >
                        Tổng
                      </text>
                      <text
                        x="110"
                        y="125"
                        textAnchor="middle"
                        className="text-xl font-bold fill-current"
                      >
                        {total}
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>

            {/* Pie Legend */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between p-2 rounded hover:bg-black/5 dark:hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-black/70 dark:bg-white/70"></div>
                    <span className="text-sm">Thành công</span>
                  </div>
                  <div className="text-sm font-medium">
                    {stats.summary.paid.count} (
                    {(
                      (stats.summary.paid.count / stats.summary.total.count) *
                      100
                    ).toFixed(1)}
                    %)
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-black/5 dark:hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-black/40 dark:bg-white/40"></div>
                    <span className="text-sm">Đang chờ</span>
                  </div>
                  <div className="text-sm font-medium">
                    {stats.summary.pending.count} (
                    {(
                      (stats.summary.pending.count / stats.summary.total.count) *
                      100
                    ).toFixed(1)}
                    %)
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-black/5 dark:hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-black/20 dark:bg-white/30"></div>
                    <span className="text-sm">Thất bại</span>
                  </div>
                  <div className="text-sm font-medium">
                    {stats.summary.failed.count} (
                    {(
                      (stats.summary.failed.count / stats.summary.total.count) *
                      100
                    ).toFixed(1)}
                    %)
                  </div>
                </div>
              </div>
          </div>

          {/* Vertical Bar Chart - Modern Design */}
          <div className="card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                📊 Biểu đồ cột - Doanh thu theo tháng
              </h3>
            </div>

            {/* Chart Container */}
            <div className="relative" style={{ height: "300px" }}>
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-8 w-24 flex flex-col justify-between text-xs text-gray-500">
                <span>{formatCurrency(maxAmount)}</span>
                <span>{formatCurrency(maxAmount * 0.75)}</span>
                <span>{formatCurrency(maxAmount * 0.5)}</span>
                <span>{formatCurrency(maxAmount * 0.25)}</span>
                <span>0đ</span>
              </div>

              {/* Grid lines */}
              <div className="absolute left-24 right-0 top-0 bottom-8 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-t border-gray-200/50"></div>
                ))}
              </div>

              {/* Bars Container */}
              <div className="absolute left-24 right-0 top-0 bottom-8 flex items-end justify-between gap-2 px-4">
                {stats.monthly.map((month) => {
                  const totalHeight = (month.total.amount / maxAmount) * 100;
                  const paidHeight = (month.paid.amount / maxAmount) * 100;
                  const pendingHeight =
                    (month.pending.amount / maxAmount) * 100;
                  const failedHeight = (month.failed.amount / maxAmount) * 100;

                  return (
                    <div
                      key={month.month}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg min-w-[200px]">
                        <div className="font-semibold mb-2">
                          {getMonthName(month.month)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Thành công:</span>
                            <span className="font-medium">
                              {formatCurrency(month.paid.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Đang chờ:</span>
                            <span>{formatCurrency(month.pending.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Thất bại:</span>
                            <span>{formatCurrency(month.failed.amount)}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                            <span>Tổng:</span>
                            <span className="font-semibold">
                              {formatCurrency(month.total.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Số lượng:</span>
                            <span>{month.total.count}</span>
                          </div>
                          {month.growth != 0 && (
                            <div className="flex justify-between">
                              <span>Tăng trưởng:</span>
                              <span
                                className={
                                  month.growth > 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }
                              >
                                {month.growth > 0 ? "+" : ""}
                                {month.growth}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                          <div className="border-8 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>

                      {/* Stacked bars */}
                      <div
                        className="relative w-full max-w-[40px] flex flex-col justify-end"
                        style={{ height: "100%" }}
                      >
                        {/* Failed bar (bottom) */}
                        {failedHeight > 0 && (
                          <div
                            className="w-full bg-black/20 dark:bg-white/30 rounded-t transition-all duration-300 hover:bg-black/30 dark:hover:bg-white/40"
                            style={{ height: `${failedHeight}%` }}
                          ></div>
                        )}
                        {/* Pending bar (middle) */}
                        {pendingHeight > 0 && (
                          <div
                            className="w-full bg-black/30 dark:bg-white/40 transition-all duration-300 hover:bg-black/40 dark:hover:bg-white/50"
                            style={{ height: `${pendingHeight}%` }}
                          ></div>
                        )}
                        {/* Paid bar (top) */}
                        {paidHeight > 0 && (
                          <div
                            className="w-full rounded-t transition-all duration-300 hover:shadow-lg bg-black/70 dark:bg-white/70"
                            style={{ height: `${paidHeight}%` }}
                          ></div>
                        )}

                        {/* Growth indicator */}
                        {month.growth != 0 && month.paid.amount > 0 && (
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold whitespace-nowrap">
                            <span className="text-black/70 dark:text-white/70">
                              {month.growth > 0 ? "↑" : "↓"}{" "}
                              {Math.abs(month.growth)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="absolute left-24 right-0 bottom-0 flex justify-between gap-2 px-4">
                {stats.monthly.map((month) => (
                  <div key={month.month} className="flex-1 text-center">
                    <div className="text-xs muted font-medium">
                      T{month.month}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart Legend */}
            <div className="flex items-center justify-center gap-4 text-xs mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-black/70 dark:bg-white/70"></div>
                <span>Thành công</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-black/30 dark:bg-white/40"></div>
                <span>Đang chờ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-black/20 dark:bg-white/30"></div>
                <span>Thất bại</span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Table */}
        <div className="card p-4 overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Chi tiết theo tháng</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--panel-border)]">
                <th className="p-2">Tháng</th>
                <th className="p-2 text-right">Thành công</th>
                <th className="p-2 text-right">Doanh thu</th>
                <th className="p-2 text-right">Đang chờ</th>
                <th className="p-2 text-right">Thất bại</th>
                <th className="p-2 text-right">Tổng</th>
                <th className="p-2 text-right">Tăng trưởng</th>
              </tr>
            </thead>
            <tbody>
              {stats.monthly.map((month) => (
                <tr
                  key={month.month}
                  className="border-t border-[var(--panel-border)] hover:bg-[var(--card-hover)]"
                >
                  <td className="p-2">{getMonthName(month.month)}</td>
                  <td className="p-2 text-right">
                    {month.paid.count}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {formatCurrency(month.paid.amount)}
                  </td>
                  <td className="p-2 text-right">
                    {month.pending.count}
                  </td>
                  <td className="p-2 text-right">
                    {month.failed.count}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {month.total.count}
                  </td>
                  <td className="p-2 text-right">
                    {month.growth > 0 && (
                      <span className="text-black/70 dark:text-white/70">+{month.growth}%</span>
                    )}
                    {month.growth < 0 && (
                      <span className="text-black/70 dark:text-white/70">{month.growth}%</span>
                    )}
                    {month.growth == 0 && (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Thanh toán</h2>
        <div className="flex items-center gap-2">
          {view === "stats" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1 rounded border border-[var(--panel-border)] bg-[var(--panel)] text-sm"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          )}
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded transition-colors border ${
              view === "list"
                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                : "bg-[var(--panel)] hover:bg-[var(--card-hover)] border-[var(--panel-border)]"
            }`}
          >
            Danh sách
          </button>
          <button
            onClick={() => setView("stats")}
            className={`px-4 py-2 rounded transition-colors border ${
              view === "stats"
                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                : "bg-[var(--panel)] hover:bg-[var(--card-hover)] border-[var(--panel-border)]"
            }`}
          >
            Thống kê
          </button>
        </div>
      </div>

      {err && <div className="text-red-500 p-4 card">{err}</div>}

      {/* Content */}
      {view === "stats" ? (
        renderStats()
      ) : (
        <div className="card p-4 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Người dùng</th>
                <th className="p-2">Provider</th>
                <th className="p-2">Số tiền</th>
                <th className="p-2">Trạng thái</th>
                <th className="p-2">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p._id}
                  className="border-t border-[var(--panel-border)]"
                >
                  <td className="p-2">{p.user?.username || "—"}</td>
                  <td className="p-2">{p.provider}</td>
                  <td className="p-2">{formatCurrency(p.amount)}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs border ${
                        p.status === "paid"
                          ? "border-black/30 dark:border-white/40"
                          : p.status === "pending"
                          ? "border-black/20 dark:border-white/30"
                          : "border-black/15 dark:border-white/25"
                      }`}
                    >
                      {p.status === "paid"
                        ? "Thành công"
                        : p.status === "pending"
                        ? "Đang chờ"
                        : "Thất bại"}
                    </span>
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleString("vi-VN")}
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
