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
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tìm kiếm bạn bè</h1>

      {/* Search Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-pulse text-neutral-400">Đang tìm kiếm...</div>
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
              className="p-4 bg-[linear-gradient(180deg,#071025,transparent)] border border-neutral-800 rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <Avatar user={user} size="lg" />
                <div>
                  <h3 className="font-semibold text-lg text-white">
                    {user.username}
                  </h3>
                  <p className="text-sm text-neutral-400">{user.email}</p>
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

      {/* Search Tips */}
      {!query && (
        <div className="mt-8 p-4 bg-neutral-800 rounded-lg">
          <h3 className="font-medium mb-2">Mẹo tìm kiếm:</h3>
          <ul className="text-sm text-neutral-400 space-y-1">
            <li>• Nhập ít nhất 2 ký tự để bắt đầu tìm kiếm</li>
            <li>• Có thể tìm theo tên người dùng hoặc email</li>
            <li>• Kết quả sẽ hiển thị tối đa 20 người dùng</li>
          </ul>
        </div>
      )}
    </div>
  );
}
