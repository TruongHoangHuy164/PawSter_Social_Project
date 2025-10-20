import React, { useEffect, useState } from "react";
import { api } from "../../utils/api.js";
import { useAuth } from "../../state/auth.jsx";

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/admin/stats", token);
        setStats(res.data.data);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [token]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds} giây trước`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(date).toLocaleDateString("vi-VN");
  };

  if (err) return <div className="card p-4 text-red-500">{err}</div>;
  if (!stats) return <div className="card p-4">Đang tải...</div>;

  const { summary, trends, latest, top } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">📊 Tổng quan hệ thống</h2>
        <p className="text-sm text-gray-500">Thống kê và phân tích toàn diện</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Users */}
        <div className="card p-4 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-blue-500 mb-1">
                👥 Tổng người dùng
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {summary.totalUsers.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span>+{summary.newUsersLast30} người mới (30 ngày)</span>
                {summary.userGrowth !== 0 && (
                  <span
                    className={
                      summary.userGrowth > 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {summary.userGrowth > 0 ? "↑" : "↓"}{" "}
                    {Math.abs(summary.userGrowth)}%
                  </span>
                )}
              </div>
            </div>
            <div className="text-4xl opacity-20">👥</div>
          </div>
        </div>

        {/* Total Threads */}
        <div className="card p-4 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-purple-500 mb-1">
                📝 Tổng bài viết
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {summary.totalThreads.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                +{summary.newThreadsThisMonth} bài tháng này
              </div>
            </div>
            <div className="text-4xl opacity-20">📝</div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="card p-4 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-green-500 mb-1">
                💰 Tổng doanh thu
              </div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(summary.revenueThisMonth)} tháng này
              </div>
            </div>
            <div className="text-4xl opacity-20">💵</div>
          </div>
        </div>

        {/* Pro Users */}
        <div className="card p-4 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-yellow-600 mb-1">
                💎 Người dùng Pro
              </div>
              <div className="text-3xl font-bold text-yellow-600">
                {summary.proUsers.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((summary.proUsers / summary.totalUsers) * 100).toFixed(1)}%
                tổng users
              </div>
            </div>
            <div className="text-4xl opacity-20">👑</div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="card p-4 border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-orange-500 mb-1">
                ⏳ Thanh toán chờ
              </div>
              <div className="text-3xl font-bold text-orange-600">
                {summary.pendingPayments}
              </div>
              <div className="text-xs text-gray-500 mt-1">Cần xử lý</div>
            </div>
            <div className="text-4xl opacity-20">⚠️</div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="card p-4 border-l-4 border-pink-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm text-pink-500 mb-1">
                📊 Tỷ lệ chuyển đổi
              </div>
              <div className="text-3xl font-bold text-pink-600">
                {((summary.proUsers / summary.totalUsers) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Free → Pro</div>
            </div>
            <div className="text-4xl opacity-20">🎯</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            📈 Tăng trưởng người dùng (30 ngày)
          </h3>
          <div className="relative" style={{ height: "300px" }}>
            {trends.users.length > 0 && (
              <>
                {/* Y-axis */}
                <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500">
                  <span>{Math.max(...trends.users.map((d) => d.total))}</span>
                  <span>
                    {Math.floor(
                      Math.max(...trends.users.map((d) => d.total)) * 0.75
                    )}
                  </span>
                  <span>
                    {Math.floor(
                      Math.max(...trends.users.map((d) => d.total)) * 0.5
                    )}
                  </span>
                  <span>
                    {Math.floor(
                      Math.max(...trends.users.map((d) => d.total)) * 0.25
                    )}
                  </span>
                  <span>0</span>
                </div>

                {/* Grid */}
                <div className="absolute left-16 right-0 top-0 bottom-8 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-t border-gray-200/50"></div>
                  ))}
                </div>

                {/* Line Chart */}
                <svg
                  className="absolute left-16 right-0 top-0 bottom-8"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{
                    width: "calc(100% - 4rem)",
                    height: "calc(100% - 2rem)",
                  }}
                >
                  <defs>
                    <linearGradient
                      id="userGradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor="rgb(59, 130, 246)"
                        stopOpacity="0.3"
                      />
                      <stop
                        offset="100%"
                        stopColor="rgb(59, 130, 246)"
                        stopOpacity="0.05"
                      />
                    </linearGradient>
                  </defs>

                  {trends.users.length > 1 && (
                    <>
                      {/* Area */}
                      <polygon
                        fill="url(#userGradient)"
                        points={`0,100 ${trends.users
                          .map((d, i) => {
                            const x = (i / (trends.users.length - 1)) * 100;
                            const y =
                              100 -
                              (d.total /
                                Math.max(...trends.users.map((d) => d.total))) *
                                100;
                            return `${x},${y}`;
                          })
                          .join(" ")} 100,100`}
                      />

                      {/* Line */}
                      <polyline
                        fill="none"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="0.8"
                        vectorEffect="non-scaling-stroke"
                        points={trends.users
                          .map((d, i) => {
                            const x = (i / (trends.users.length - 1)) * 100;
                            const y =
                              100 -
                              (d.total /
                                Math.max(...trends.users.map((d) => d.total))) *
                                100;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />

                      {/* Points */}
                      {trends.users.map((d, i) => {
                        const x = (i / (trends.users.length - 1)) * 100;
                        const y =
                          100 -
                          (d.total /
                            Math.max(...trends.users.map((d) => d.total))) *
                            100;
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="1"
                            fill="rgb(59, 130, 246)"
                          />
                        );
                      })}
                    </>
                  )}
                </svg>

                {/* X-axis */}
                <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-gray-600">
                  <span>
                    {new Date(trends.users[0]?.date).toLocaleDateString(
                      "vi-VN",
                      { day: "2-digit", month: "2-digit" }
                    )}
                  </span>
                  {trends.users.length > 2 && (
                    <span>
                      {new Date(
                        trends.users[Math.floor(trends.users.length / 2)]?.date
                      ).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  )}
                  <span>
                    {new Date(
                      trends.users[trends.users.length - 1]?.date
                    ).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            💰 Doanh thu theo tháng
          </h3>
          <div className="relative" style={{ height: "300px" }}>
            {trends.revenue.length > 0 && (
              <>
                {/* Y-axis */}
                <div className="absolute left-0 top-0 bottom-8 w-20 flex flex-col justify-between text-xs text-gray-500">
                  <span>
                    {formatCurrency(
                      Math.max(...trends.revenue.map((d) => d.amount))
                    )}
                  </span>
                  <span>
                    {formatCurrency(
                      Math.max(...trends.revenue.map((d) => d.amount)) * 0.75
                    )}
                  </span>
                  <span>
                    {formatCurrency(
                      Math.max(...trends.revenue.map((d) => d.amount)) * 0.5
                    )}
                  </span>
                  <span>
                    {formatCurrency(
                      Math.max(...trends.revenue.map((d) => d.amount)) * 0.25
                    )}
                  </span>
                  <span>0đ</span>
                </div>

                {/* Grid */}
                <div className="absolute left-20 right-0 top-0 bottom-8 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-t border-gray-200/50"></div>
                  ))}
                </div>

                {/* Bars */}
                <div className="absolute left-20 right-0 top-0 bottom-8 flex items-end justify-between gap-2 px-2">
                  {trends.revenue.map((d, i) => {
                    const height =
                      (d.amount /
                        Math.max(...trends.revenue.map((d) => d.amount))) *
                      100;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center group relative"
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 whitespace-nowrap z-10">
                          <div className="font-semibold">
                            T{d.month}/{d.year}
                          </div>
                          <div>{formatCurrency(d.amount)}</div>
                          <div>{d.count} giao dịch</div>
                        </div>

                        {/* Bar */}
                        <div
                          className="w-full rounded-t transition-all"
                          style={{
                            height: `${height}%`,
                            background:
                              "linear-gradient(180deg, rgb(34, 197, 94), rgb(22, 163, 74))",
                          }}
                        ></div>
                      </div>
                    );
                  })}
                </div>

                {/* X-axis */}
                <div className="absolute left-20 right-0 bottom-0 flex justify-between gap-2 px-2 text-xs text-gray-600">
                  {trends.revenue.map((d, i) => (
                    <div key={i} className="flex-1 text-center">
                      T{d.month}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Latest Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Users */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">👤 Người dùng mới nhất</h3>
          <div className="space-y-3">
            {latest.users.map((user, i) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      {user.isPro && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(user.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Threads */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">📝 Bài viết mới nhất</h3>
          <div className="space-y-3">
            {latest.threads.map((thread, i) => (
              <div
                key={thread._id}
                className="p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {thread.author?.username || "Unknown"}
                    </span>
                    {thread.author?.isPro && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">
                        PRO
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimeAgo(thread.createdAt)}
                  </div>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {thread.content}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>❤️ {thread.likesCount || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Threads */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            🏆 Top bài viết (theo lượt thích)
          </h3>
          <div className="space-y-2">
            {top.threads.map((thread, i) => (
              <div
                key={thread._id}
                className="flex items-start gap-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {thread.author?.username || "Unknown"}
                    </span>
                    {thread.author?.isPro && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">
                        PRO
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1 mb-1">
                    {thread.content}
                  </div>
                  <div className="text-xs text-gray-500">
                    ❤️ {thread.likesCount} lượt thích
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            👑 Top người dùng (theo số bài viết)
          </h3>
          <div className="space-y-2">
            {top.users.map((user, i) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 text-white font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      {user.isPro && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.threadCount} bài viết • {user.totalLikes} lượt thích
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
