import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Avatar from "./Avatar.jsx";
import TrendingHashtags from "./TrendingHashtags.jsx";
import { useAuth } from "../state/auth.jsx";
import { userApi } from "../utils/api.js";

export default function RightSidebar() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [suggested, setSuggested] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoadingSuggestions(true);
      try {
        const { data } = await userApi.getFollowSuggestions(token);
        const items = data?.data || data || [];
        setSuggested(items);
      } catch (e) { console.error("Load suggestions failed", e); }
      finally { setLoadingSuggestions(false); }
    };
    load();
    // Refresh suggestions when page reloads; backend shuffles results
  }, [token]);

  const handleFollow = async (userId) => {
    try {
      if (followingUsers.has(userId)) {
        await userApi.unfollowUser(userId, token);
        setFollowingUsers((prev) => {
          const s = new Set(prev); s.delete(userId); return s;
        });
        // Do not re-add to suggestions here; keep it as-is
      } else {
        await userApi.followUser(userId, token);
        setFollowingUsers((prev) => new Set(prev).add(userId));
        // Remove from suggestions immediately once followed
        setSuggested((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (e) { console.error("Toggle follow failed", e); }
  };

  return (
    <aside className="hidden lg:block w-80 space-y-4">
      <div className="sticky top-4 space-y-4">
        {/* Search Bar */}
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              placeholder="Search Pawster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/15 rounded-xl text-sm placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            />
          </div>
        </div>

        {/* Pawster Today - Trending Hashtags */}
        <TrendingHashtags />

        {/* Suggested for You */}
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
            Gợi ý theo dõi 
          </h3>
          <div className="space-y-3">
            {loadingSuggestions && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Đang tải gợi ý...</div>
            )}
            {!loadingSuggestions && suggested.length === 0 && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Chưa có gợi ý</div>
            )}
            {suggested.map((user) => (
              <div key={user._id} className="flex items-center justify-between">
                <div 
                  role="button"
                  onClick={() => navigate(`/profile/${user._id}`)}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-90"
                >
                  <Avatar
                    user={{ username: user.username, avatarUrl: user.avatarUrl }}
                    size="sm"
                  />
                  <div>
                    <div className="text-sm font-medium text-black dark:text-white">
                      {user.username}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {user.followersCount || 0} người theo dõi
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFollow(user._id); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    followingUsers.has(user._id)
                      ? "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700"
                      : "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200"
                  }`}
                >
                  {followingUsers.has(user._id) ? "Đang theo dõi" : "Theo dõi"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
