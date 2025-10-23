import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userApi, api, threadApi } from "../../utils/api.js";
import { useAuth } from "../../state/auth.jsx";
import ThreadItem from "../../ui/ThreadItem.jsx";
import RepostItem from "../../ui/RepostItem.jsx";

const TABS = [
  { key: "threads", label: "Paw" },
  { key: "media", label: "File phương tiện" },
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
    // Reset states when userId changes
    setUser(null);
    setThreads([]);
    setReposts([]);
    setRepostsLoaded(false);
    setIsFollowing(false);
    
    fetchUserProfile();
  }, [userId]);

  // Load reposts along with threads
  useEffect(() => {
    if (!token || !userId || repostsLoaded) return;
    (async () => {
      try {
        console.log('Loading reposts for userId:', userId);
        const res = await threadApi.getReposts(userId, token);
        const userReposts = (res.data.data || []).map(thread => ({
          ...thread,
          isRepost: true
        }));
        console.log('Loaded reposts:', userReposts.length);
        setReposts(userReposts);
        setRepostsLoaded(true);
      } catch (e) {
        console.error("Failed to fetch reposts:", e);
      }
    })();
  }, [token, userId, repostsLoaded]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      console.log('Fetching profile for userId:', userId);
      
      const response = await userApi.getUserById(userId, token);
      const userData = response.data.data;
      setUser(userData);

      // Check if already following
      if (currentUser && currentUser.following) {
        setIsFollowing(currentUser.following.includes(userId));
      }

      // Fetch threads of this user using author filter
      const threadsResponse = await api.get(`/threads?author=${userId}`, token);
      const userThreads = threadsResponse.data.data || [];
      
      console.log('UserProfile threads loaded:', {
        userId: userId,
        threadsCount: userThreads.length,
        sample: userThreads.slice(0, 2).map(t => ({
          id: t._id,
          authorId: t.author?._id,
          content: t.content?.slice(0, 30),
          isRepost: t.isRepost
        }))
      });
      
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
      <div className="border-b border-black/10 dark:border-white/10 grid grid-cols-2 px-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-2 py-3.5 relative font-bold text-sm flex items-center justify-center gap-1 rounded-t-xl transition-all duration-200 ${
              activeTab === t.key
                ? "text-black dark:text-white bg-black/5 dark:bg-white/5"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            {t.key === "threads" && "📝"}
            {t.key === "media" && "📁"}
            {t.label}
            {activeTab === t.key && (
              <span className="absolute left-0 right-0 -bottom-px h-1 bg-black dark:bg-white rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "threads" &&
          (() => {
            // Combine threads and reposts, then sort by date
            const combined = [
              ...threads.map(t => ({ ...t, isRepost: false })),
              ...reposts
            ];
            
            // Remove duplicates based on _id
            const seenIds = new Set();
            const deduplicated = combined.filter(item => {
              if (seenIds.has(item._id)) {
                return false; // Skip duplicate
              }
              seenIds.add(item._id);
              return true;
            });
            
            console.log('UserProfile combined data:', {
              threads: threads.length,
              reposts: reposts.length,
              combined: combined.length,
              deduplicated: deduplicated.length,
              duplicatesRemoved: combined.length - deduplicated.length
            });
            
            const sorted = deduplicated.sort((a, b) => {
              const dateA = a.createdAt;
              const dateB = b.createdAt;
              return new Date(dateB) - new Date(dateA);
            });
            
            return sorted.length ? (
              sorted.map((t) => (
                t.isRepost ? (
                  <RepostItem 
                    key={`repost_${t._id}`} 
                    repost={t}
                    onDelete={(repostId) => {
                      console.log('UserProfile: Deleting repost with ID:', repostId);
                      setReposts(prev => {
                        const newReposts = prev.filter(r => {
                          // Check against the actual MongoDB repost ID or formatted ID
                          if (r.repostId && (r.repostId === repostId || repostId.includes(r.repostId))) {
                            console.log('Removing repost from UserProfile:', r.repostId);
                            return false;
                          }
                          if (r._id === repostId) {
                            console.log('Removing repost from UserProfile by _id:', r._id);
                            return false;
                          }
                          return true;
                        });
                        console.log('UserProfile reposts after deletion:', newReposts.length);
                        return newReposts;
                      });
                    }}
                  />
                ) : (
                  <ThreadItem key={`thread_${t._id}`} thread={t} />
                )
              ))
            ) : (
              <div className="text-sm text-neutral-500 text-center py-8">
                Chưa có bài viết
              </div>
            );
          })()}

        {activeTab === "media" &&
          (mediaThreads.length ? (
            mediaThreads.map((t) => <ThreadItem key={t._id} thread={t} />)
          ) : (
            <div className="text-sm text-neutral-500 text-center py-8">
              Không có file phương tiện
            </div>
          ))}
      </div>
    </div>
  );
}
