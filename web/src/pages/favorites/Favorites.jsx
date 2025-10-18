import { useState, useEffect } from "react";
import { useAuth } from "../../state/auth.jsx";
import { threadApi } from "../../utils/api.js";
import ThreadItem from "../../ui/ThreadItem.jsx";

export default function Favorites() {
  const { user, token } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user || !token) return;

      try {
        setLoading(true);
        setError(null);
        const res = await threadApi.getFavorites(user._id, token);
        setFavorites(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch favorites:", err);
        setError(err.message || "Không thể tải bài viết yêu thích");
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user, token]);

  const handleDelete = (threadId) => {
    setFavorites((prev) => prev.filter((t) => t._id !== threadId));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        Yêu thích
      </h1>

      {loading && (
        <div className="text-center py-8">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: "var(--accent)" }}
          ></div>
        </div>
      )}

      {error && (
        <div className="card p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && favorites.length === 0 && (
        <div className="card p-8 rounded-lg text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Bạn chưa có bài viết yêu thích nào
          </p>
        </div>
      )}

      {!loading && !error && favorites.length > 0 && (
        <div className="space-y-4">
          {favorites.map((thread) => (
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
