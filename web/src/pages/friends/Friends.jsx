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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Danh sách bạn bè</h2>
              <div className="text-sm text-neutral-400">
                {friends.length}/{user?.isPro ? 200 : 20}
              </div>
            </div>
            {loading && (
              <div className="text-sm text-neutral-500">Đang tải...</div>
            )}
            {!loading && friends.length === 0 && (
              <div className="text-sm text-neutral-500">Chưa có bạn bè.</div>
            )}
            <ul className="space-y-3">
              {friends.map((f) => (
                <li
                  key={f._id}
                  className="p-3 card rounded flex items-center justify-between transition-pop"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar user={f} size="md" />
                    <div>
                      <div className="font-medium">{f.username}</div>
                      <div className="text-xs text-neutral-400">{f.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {f.isPro && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-black/20 dark:border-white/20">
                        PRO
                      </span>
                    )}
                    {f.badges &&
                      f.badges.map((badge, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-0.5 rounded-full border border-black/20 dark:border-white/20"
                        >
                          {badge}
                        </span>
                      ))}
                    <button
                      onClick={() => handleRemoveFriend(f._id)}
                      className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-xs transition-colors"
                      title="Xóa bạn bè"
                    >
                      Xóa bạn
                    </button>
                  </div>
                </li>
              ))}
            </ul>
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
      <div className="flex border-b border-black/10 dark:border-white/10">
        <button
          onClick={() => setActiveTab("friends")}
          className={`px-4 py-2 font-medium ${
            activeTab === "friends"
              ? "text-black dark:text-white border-b-2 border-black dark:border-white"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Bạn bè ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 font-medium ml-4 ${
            activeTab === "requests"
              ? "text-black dark:text-white border-b-2 border-black dark:border-white"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Lời mời
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`px-4 py-2 font-medium ml-4 ${
            activeTab === "search"
              ? "text-black dark:text-white border-b-2 border-black dark:border-white"
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
