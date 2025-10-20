import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userApi, api, threadApi } from "../../utils/api.js";
import { useAuth } from "../../state/auth.jsx";
import ThreadItem from "../../ui/ThreadItem.jsx";

const TABS = [
  { key: "threads", label: "Bài viết" },
  { key: "media", label: "File phương tiện" },
  { key: "reposts", label: "Đăng lại" },
];

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser, token } = useAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [reposts, setReposts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("threads");
  const [repostsLoaded, setRepostsLoaded] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  // Fetch reposts when reposts tab is active
  useEffect(() => {
    if (!token || !userId || activeTab !== "reposts" || repostsLoaded) return;
    (async () => {
      try {
        const res = await threadApi.getReposts(userId, token);
        setReposts(res.data.data || []);
        setRepostsLoaded(true);
      } catch (e) {
        console.error("Failed to fetch reposts:", e);
      }
    })();
  }, [token, userId, activeTab, repostsLoaded]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getUserById(userId, token);
      const userData = response.data.data;
      setUser(userData);

      // Check if already following
      if (currentUser && currentUser.following) {
        setIsFollowing(currentUser.following.includes(userId));
      }

      // Fetch threads of this user
      const threadsResponse = await api.get("/threads", token);
      const allThreads = threadsResponse.data.data || [];
      // Filter threads by this user
      const userThreads = allThreads.filter(
        (t) => t.author && t.author._id === userId
      );
      setThreads(userThreads);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await userApi.unfollowUser(userId, token);
        setIsFollowing(false);
        setUser((prev) => ({
          ...prev,
          followers: prev.followers.filter((id) => id !== currentUser.id),
        }));
      } else {
        await userApi.followUser(userId, token);
        setIsFollowing(true);
        setUser((prev) => ({
          ...prev,
          followers: [...(prev.followers || []), currentUser.id],
        }));
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      alert(error.message || "Có lỗi xảy ra");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-black/20 dark:border-white/20 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Không tìm thấy người dùng</p>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === userId;
  const mediaThreads = threads.filter((t) => t.media && t.media.length > 0);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Cover Image */}
  <div className="relative h-44 rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-transparent">
        {user.coverUrl ? (
          <img
            src={user.coverUrl}
            alt="cover"
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-600">
            <span className="text-sm">Chưa có ảnh bìa</span>
          </div>
        )}
      </div>

      {/* Avatar & Info */}
      <div className="relative pl-2 -mt-16">
        <div className="flex items-end gap-4">
          <div className="w-32 h-32 rounded-full ring-4 ring-neutral-200 bg-white overflow-hidden flex items-center justify-center">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="text-neutral-400 text-2xl">
                {user.username[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="pb-4 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xl font-semibold">
                  {user.username}
                  {user.isPro && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-black/20 dark:border-white/20">PRO</span>
                  )}
                </div>
                <div className="text-neutral-400 text-sm">@{user.username}</div>
              </div>

              {/* Follow Button - only show if not own profile */}
              {!isOwnProfile && (
                <button
                  onClick={handleFollow}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    isFollowing
                      ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
                      : "bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
                  }`}
                >
                  {isFollowing ? "Đang theo dõi" : "Theo dõi"}
                </button>
              )}

              {/* Edit Button - only show if own profile */}
              {isOwnProfile && (
                <button
                  onClick={() => navigate("/profile")}
                  className="px-6 py-2 rounded-lg font-semibold bg-gray-600 hover:bg-gray-700 text-white transition"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-4 mt-3 text-xs text-neutral-400">
              <span>
                <span className="text-neutral-200 font-medium">
                  {user.friends?.length || 0}
                </span>{" "}
                Bạn bè
              </span>
              <span>
                <span className="text-neutral-200 font-medium">
                  {user.followers?.length || 0}
                </span>{" "}
                Người theo dõi
              </span>
              <span>
                <span className="text-neutral-200 font-medium">
                  {user.following?.length || 0}
                </span>{" "}
                Đang theo dõi
              </span>
            </div>
          </div>
        </div>

        {/* Bio & Website */}
        {(user.bio || user.website) && (
          <div className="mt-4 space-y-2">
            {user.bio && (
              <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                {user.bio}
              </p>
            )}
            {user.website && (
              <div className="text-xs text-neutral-400">
                Website:{" "}
                <a
                  className="text-black dark:text-white hover:underline"
                  target="_blank"
                  rel="noreferrer"
                  href={user.website}
                >
                  {user.website}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
  <div className="border-b border-black/10 dark:border-white/10 flex gap-8 px-2 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`py-3 relative ${
              activeTab === t.key
                ? "text-white"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
              {activeTab === t.key && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-black dark:bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "threads" &&
          (threads.length ? (
            threads.map((t) => <ThreadItem key={t._id} thread={t} />)
          ) : (
            <div className="text-sm text-neutral-500 text-center py-8">
              Chưa có bài viết
            </div>
          ))}

        {activeTab === "media" &&
          (mediaThreads.length ? (
            mediaThreads.map((t) => <ThreadItem key={t._id} thread={t} />)
          ) : (
            <div className="text-sm text-neutral-500 text-center py-8">
              Không có file phương tiện
            </div>
          ))}

        {activeTab === "reposts" &&
          (reposts.length ? (
            reposts.map((t) => (
              <div key={t._id} className="space-y-2">
                <div className="text-xs text-neutral-400 flex items-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <polyline points="7 23 3 19 7 15"></polyline>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                  </svg>
                  <span>{user.username} đã đăng lại</span>
                </div>
                <ThreadItem thread={t} />
              </div>
            ))
          ) : (
            <div className="text-sm text-neutral-500 text-center py-8">
              Chưa có bài đăng lại
            </div>
          ))}
      </div>
    </div>
  );
}
