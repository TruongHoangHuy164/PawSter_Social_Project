import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth.jsx";
import { api } from "../utils/api.js";

export default function TrendingHashtags() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("24h");

  useEffect(() => {
    const fetchTrending = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const response = await api.get(
          `/threads/hashtags/trending?period=${period}&limit=10`,
          token
        );
        if (response.data.success) {
          setTrending(response.data.data.trending);
        }
      } catch (error) {
        console.error("Error fetching trending hashtags:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [token, period]);

  if (loading) {
    return (
      <div className="card p-4 rounded-2xl bg-white/50 dark:bg-black/50 border-2 border-black/10 dark:border-white/10">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          🔥 Trending Today
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!trending || trending.length === 0) {
    return (
      <div className="card p-4 rounded-2xl bg-white/50 dark:bg-black/50 border-2 border-black/10 dark:border-white/10">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          🔥 Trending Today
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Chưa có hashtag trending
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 rounded-2xl bg-white/50 dark:bg-black/50 border-2 border-black/10 dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          🔥 Trending Today
        </h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-xs px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-semibold"
        >
          <option value="24h">24h</option>
          <option value="7d">7 ngày</option>
          <option value="30d">30 ngày</option>
        </select>
      </div>

      {/* Trending List */}
      <div className="space-y-3">
        {trending.map((item, index) => (
          <div
            key={item.tag}
            className="block p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/hashtag/${item.tag}`);
            }}
          >
            <div className="flex items-start gap-2">
              {/* Rank Badge */}
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0
                    ? "bg-yellow-500 text-white"
                    : index === 1
                    ? "bg-gray-400 text-white"
                    : index === 2
                    ? "bg-orange-600 text-white"
                    : "bg-black/10 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {index + 1}
              </div>

              {/* Hashtag Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-blue-500 dark:text-blue-400 group-hover:underline truncate">
                  #{item.tag}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {item.count} {item.count === 1 ? "bài viết" : "bài viết"}
                </div>
              </div>

              {/* Trending Icon */}
              {index < 3 && (
                <svg
                  className="w-4 h-4 text-red-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10">
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate("/search?tab=hashtags");
          }}
          className="text-xs text-blue-500 dark:text-blue-400 hover:underline font-bold cursor-pointer"
        >
          Xem tất cả hashtags →
        </div>
      </div>
    </div>
  );
}
