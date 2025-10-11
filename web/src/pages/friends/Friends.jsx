import React, { useEffect, useState } from "react";
import { api } from "../../utils/api.js";
import { useAuth } from "../../state/auth.jsx";
import FriendRequests from "./FriendRequests";
import SearchUsers from "./SearchUsers";
import Avatar from "../../ui/Avatar";
import ConfirmModal from "../../ui/ConfirmModal";

export default function Friends() {
  const { user, token } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("friends");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    if (activeTab === "friends") {
      fetchFriends();
    }
  }, [user, token, activeTab]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${user._id}/friends`, token);
      setFriends(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    const friend = friends.find((f) => f._id === friendId);
    setFriendToRemove(friend);
    setShowConfirmModal(true);
  };

  const confirmRemoveFriend = async () => {
    if (!friendToRemove) return;

    try {
      await api.del(`/users/friends/${friendToRemove._id}/remove`, token);
      // Refresh friends list
      fetchFriends();
    } catch (error) {
      console.error("Error removing friend:", error);
      alert("Có lỗi xảy ra khi xóa bạn bè");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "friends":
        return (
          <div>
            {/* Stats & Search */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-2">
                <h2 className="text-2xl font-bold">Danh sách bạn bè</h2>
                <p className="text-sm text-neutral-400">
                  Những người bạn đang kết nối trên PawSter
                </p>
              </div>
              <div className="flex items-center justify-end md:justify-end gap-4">
                <div className="w-full md:w-[220px]">
                  <input
                    type="text"
                    placeholder="Lọc theo tên..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg placeholder-neutral-500 dark:placeholder-neutral-400 text-neutral-900 dark:text-white focus:outline-none focus:border-violet-500"
                    aria-label="Lọc bạn bè"
                  />
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {friends.length}/
                  {user?.friendLimit ?? (user?.isPro ? 200 : 20)}
                </div>
                <button
                  onClick={() => setActiveTab("search")}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-sm"
                >
                  Tìm bạn
                </button>
              </div>
            </div>

            {loading && (
              <div className="text-sm text-neutral-500">Đang tải...</div>
            )}
            {!loading && friends.length === 0 && (
              <div className="text-sm text-neutral-500">Chưa có bạn bè.</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friends
                .filter((f) =>
                  filter
                    ? f.username?.toLowerCase().includes(filter.toLowerCase())
                    : true
                )
                .map((f) => (
                  <div
                    key={f._id}
                    className="p-4 bg-white dark:bg-[linear-gradient(180deg,#0b1220,transparent)] border border-neutral-200 dark:border-neutral-800 rounded-lg flex items-center gap-4 shadow-sm hover:shadow-md transition"
                  >
                    <Avatar user={f} size="lg" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-lg text-neutral-900 dark:text-white">
                            {f.username}
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400">
                            @{f.username} • {f.email}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="text-sm">
                            {f.isPro && (
                              <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded mr-2">
                                PRO
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400">
                            Joined
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {f.badges &&
                            f.badges.slice(0, 3).map((badge, index) => (
                              <span
                                key={index}
                                className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded"
                              >
                                {badge}
                              </span>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemoveFriend(f._id)}
                            className="px-3 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-700/10"
                          >
                            Xóa
                          </button>
                          <button className="px-3 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700">
                            Nhắn
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      case "requests":
        return <FriendRequests />;
      case "search":
        return <SearchUsers />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold">Quản lý bạn bè</h1>

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-700">
        <button
          onClick={() => setActiveTab("friends")}
          className={`px-4 py-2 font-medium ${
            activeTab === "friends"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Bạn bè ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 font-medium ml-4 ${
            activeTab === "requests"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Lời mời
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`px-4 py-2 font-medium ml-4 ${
            activeTab === "search"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Tìm kiếm
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">{renderTabContent()}</div>

      {/* Confirm Remove Friend Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setFriendToRemove(null);
        }}
        onConfirm={confirmRemoveFriend}
        title="Xóa bạn bè"
        message={`Bạn có chắc chắn muốn xóa ${friendToRemove?.username} khỏi danh sách bạn bè? Hành động này không thể hoàn tác.`}
        confirmText="Xóa bạn bè"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
}
