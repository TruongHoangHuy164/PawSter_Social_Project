import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../state/auth";
import { api } from "../../utils/api";
import Avatar from "../../ui/Avatar";

export default function SearchUsers() {
  const { user, token } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const searchUsers = useCallback(
    async (searchQuery) => {
      if (!searchQuery || searchQuery.length < 2) {
        setUsers([]);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(
          `/users/search?q=${encodeURIComponent(searchQuery)}`,
          token
        );
        setUsers(response.data.data || []);
      } catch (error) {
        console.error("Error searching users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      searchUsers(query);
    }, 300); // Debounce search

    setSearchTimeout(timeout);

    return () => clearTimeout(timeout);
  }, [query, searchUsers]);

  const handleSendRequest = async (userId) => {
    try {
      await api.post(`/users/friends/${userId}/send`, {}, token);
      // Refresh search results to update friendship status
      searchUsers(query);
    } catch (error) {
      console.error("Error sending friend request:", error);
      // Hiển thị thông báo lỗi từ server
      alert(error.message || "Có lỗi xảy ra khi gửi lời mời kết bạn");
    }
  };

  const handleCancelRequest = async (userId) => {
    try {
      // Find the request ID (we need to search for it)
      const sentRequests = await api.get("/users/friends/requests/sent", token);
      const request = sentRequests.data.data.find(
        (req) => String(req.to._id) === String(userId)
      );

      if (request) {
        await api.del(`/users/friends/${request._id}/cancel`, token);
        searchUsers(query); // Refresh results
      }
    } catch (error) {
      console.error("Error cancelling friend request:", error);
    }
  };

  const handleRemoveFriend = async (userId, username) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${username} khỏi danh sách bạn bè?`
      )
    ) {
      return;
    }

    try {
      await api.del(`/users/friends/${userId}/remove`, token);
      searchUsers(query); // Refresh results
    } catch (error) {
      console.error("Error removing friend:", error);
      alert("Có lỗi xảy ra khi xóa bạn bè");
    }
  };

  const getFriendshipButton = (user) => {
    switch (user.friendshipStatus) {
      case "friends":
        return (
          <div className="flex space-x-2">
            <span className="px-3 py-1.5 bg-green-600 text-white rounded text-sm">
              Bạn bè
            </span>
            <button
              onClick={() => handleRemoveFriend(user._id, user.username)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              title="Xóa bạn bè"
            >
              Xóa bạn
            </button>
          </div>
        );
      case "sent":
        return (
          <button
            onClick={() => handleCancelRequest(user._id)}
            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
          >
            Hủy lời mời
          </button>
        );
      case "received":
        return (
          <span className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">
            Đã gửi cho bạn
          </span>
        );
      default:
        return (
          <button
            onClick={() => handleSendRequest(user._id)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            Kết bạn
          </button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-teal-900 dark:to-emerald-900">
      <div className="max-w-5xl mx-auto p-6">
        {/* Hero Header */}
        <div className="relative mb-8 p-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.15'%3E%3Ccircle cx='30' cy='30' r='8'/%3E%3Ccircle cx='30' cy='30' r='16'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            ></div>
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                🔍 Tìm kiếm bạn bè
              </h1>
              <p className="text-emerald-100 text-lg">
                Khám phá và kết nối với những người bạn mới trên PawSter
              </p>
            </div>
            {users.length > 0 && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/30">
                <div className="text-center text-white">
                  <div className="text-3xl font-bold">{users.length}</div>
                  <div className="text-xs text-emerald-100">
                    Kết quả tìm thấy
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Premium Search Input */}
        <div className="mb-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="h-6 w-6 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên người dùng hoặc email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-16 py-4 bg-white/80 dark:bg-gray-700/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all text-lg font-medium shadow-inner"
            />

            {/* Clear button / loading */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
              {query && !loading && (
                <button
                  onClick={() => {
                    setQuery("");
                    setUsers([]);
                  }}
                  aria-label="Xóa tìm kiếm"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-110"
                >
                  <svg
                    className="h-5 w-5 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}

              {loading && (
                <div className="h-10 w-10 inline-flex items-center justify-center">
                  <svg
                    className="h-6 w-6 animate-spin text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>💡 Mẹo: Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm</span>
            </div>
            {query && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Đang tìm kiếm...</span>
              </div>
            )}
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                  <div className="w-56">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
                    <div className="h-3 w-40 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  </div>
                </div>
                <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* No Query */}
        {!query && !loading && (
          <div className="text-center py-8 text-neutral-500">
            Nhập tên hoặc email để tìm kiếm bạn bè
          </div>
        )}

        {/* No Results */}
        {query && !loading && users.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            Không tìm thấy người dùng nào
          </div>
        )}

        {/* Search Results */}
        {users.length > 0 && (
          <div className="grid gap-4">
            {users.map((user) => (
              <div
                key={user._id}
                className="p-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg flex items-center justify-between hover:shadow-md transition"
              >
                <div className="flex items-center space-x-4">
                  <Avatar user={user} size="lg" />
                  <div>
                    <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                      {user.username}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {user.email}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {user.isPro && (
                        <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded">
                          PRO
                        </span>
                      )}
                      {user.badges && user.badges.length > 0 && (
                        <div className="flex space-x-1">
                          {user.badges.map((badge, index) => (
                            <span
                              key={index}
                              className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>{getFriendshipButton(user)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Premium Search Tips */}
        {!query && (
          <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                Mẹo tìm kiếm hiệu quả
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      2+
                    </span>
                  </div>
                  <span>Nhập ít nhất 2 ký tự</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-teal-600 dark:text-teal-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    </svg>
                  </div>
                  <span>Tìm theo tên hoặc email</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                      20
                    </span>
                  </div>
                  <span>Tối đa 20 kết quả</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
