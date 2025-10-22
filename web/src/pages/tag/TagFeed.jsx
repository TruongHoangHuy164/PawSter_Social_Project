import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../utils/api.js";
import { useAuth } from "../../state/auth.jsx";
import ThreadItem from "../../ui/ThreadItem.jsx";

export default function TagFeed() {
  const { token } = useAuth();
  const { tag } = useParams(); // Lấy hashtag từ URL (vd: /hashtag/mèo_cưng)
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  // Fetch threads khi component mount hoặc tag thay đổi
  useEffect(() => {
    if (!tag || !token) return;

    const fetchThreads = async () => {
      setLoading(true);
      setError("");
      console.log("🔍 Fetching threads for hashtag:", tag);

      try {
        const response = await api.get(`/threads/hashtag/${tag}`, token);
        console.log("✅ API Response:", response.data);

        if (response.data.success) {
          const data = response.data.data;
          setThreads(data.threads || []);
          setTotalCount(data.total || 0);
          console.log(`📊 Loaded ${data.threads?.length || 0} threads`);
        } else {
          setError("Không thể tải bài viết");
        }
      } catch (err) {
        console.error("❌ Error loading hashtag:", err);
        setError(err.message || "Lỗi tải bài viết");
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [tag, token]);

  const handleDelete = (threadId) => {
    setThreads((prev) => prev.filter((t) => t._id !== threadId));
    setTotalCount((prev) => prev - 1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* ============================================== */}
      {/* HEADER: Hiển thị hashtag và số lượng bài viết */}
      {/* ============================================== */}
      <div className="card p-6 mb-4 rounded-2xl bg-white/50 dark:bg-black/50 border-2 border-black/10 dark:border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-3">
          <Link
            to="/feed"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Quay lại feed"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">#{tag}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mt-1">
              {loading ? "Đang tải..." : `${totalCount} bài viết`}
            </p>
          </div>
        </div>

        {/* Info message */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mt-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            💡 Tất cả bài viết có hashtag{" "}
            <span className="font-bold">#{tag}</span>
          </p>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-black/20 dark:border-white/20 border-t-black dark:border-t-white animate-spin"></div>
            <p className="text-sm text-neutral-500 font-medium">
              Đang tải bài viết...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="card p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-600 dark:text-red-400 font-semibold">
            {error}
          </p>
        </div>
      )}

      {!loading && !error && threads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <div className="text-base text-neutral-600 dark:text-neutral-400 font-bold">
            Chưa có bài viết nào
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-500 font-medium mt-1">
            Hãy là người đầu tiên dùng hashtag #{tag}
          </div>
        </div>
      )}

      {!loading && !error && threads.length > 0 && (
        <div className="space-y-4">
          {threads.map((thread) => (
            <ThreadItem
              key={thread._id}
              thread={thread}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
