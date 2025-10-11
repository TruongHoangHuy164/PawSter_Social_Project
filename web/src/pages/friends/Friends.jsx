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
          <div className="space-y-6">
            {/* Premium Stats & Search Panel */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Danh sách bạn bè
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    Những người bạn đang kết nối trên PawSter
                  </p>
                </div>
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                  <div className="flex-1 lg:min-w-[240px]">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="🔍 Tìm kiếm bạn bè..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        aria-label="Lọc bạn bè"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between lg:justify-end gap-4">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">
                        {friends.length}/
                        {user?.friendLimit ?? (user?.isPro ? 200 : 20)}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab("search")}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      ➕ Tìm bạn
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300 text-lg">
                    Đang tải danh sách bạn bè...
                  </p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && friends.length === 0 && (
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/20 shadow-xl">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Chưa có bạn bè
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Hãy bắt đầu kết nối với những người bạn mới trên PawSter!
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  🔍 Tìm bạn bè ngay
                </button>
              </div>
            )}

            {/* Friends Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {friends
                .filter((f) =>
                  filter
                    ? f.username?.toLowerCase().includes(filter.toLowerCase())
                    : true
                )
                .map((f) => (
                  <div
                    key={f._id}
                    className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar user={f} size="xl" />
                        {f.isPro && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              ★
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white truncate">
                              {f.username}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              @{f.username} • {f.email}
                            </p>
                          </div>
                          {f.isPro && (
                            <span className="ml-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold rounded-full whitespace-nowrap">
                              PRO
                            </span>
                          )}
                        </div>

                        {/* Badges */}
                        {f.badges && f.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {f.badges.slice(0, 3).map((badge, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg"
                              >
                                {badge}
                              </span>
                            ))}
                            {f.badges.length > 3 && (
                              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-lg">
                                +{f.badges.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          <button
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                            title={`Nhắn tin với ${f.username}`}
                            aria-label={`Nhắn tin với ${f.username}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            <span>Nhắn tin</span>
                          </button>
                          <button
                            onClick={() => handleRemoveFriend(f._id)}
                            className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/40 hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                            aria-label={`Xóa ${f.username}`}
                            title={`Xóa ${f.username} khỏi danh sách bạn bè`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Modern Hero Header */}
        <div className="relative mb-8 p-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.15'%3E%3Cpath d='M30 30c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm10 0c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm10 0c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            ></div>
          </div>
          <div className="relative">
            <h1 className="text-4xl font-bold text-white mb-4">
              🤝 Quản lý bạn bè
            </h1>
            <p className="text-purple-100 text-lg">
              Kết nối và xây dựng cộng đồng của bạn trên PawSter
            </p>
          </div>
        </div>

        {/* Premium Tab Navigation */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-2 mb-8 border border-white/20 shadow-xl">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 px-6 py-4 font-semibold rounded-xl transition-all duration-300 ${
                activeTab === "friends"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-[1.02] shadow-indigo-200"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:scale-[1.01]"
              }`}
            >
              <span className="flex items-center justify-center space-x-3">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Bạn bè ({friends.length})</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 px-6 py-4 font-semibold rounded-xl transition-all duration-300 ${
                activeTab === "requests"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-[1.02] shadow-indigo-200"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:scale-[1.01]"
              }`}
            >
              <span className="flex items-center justify-center space-x-3">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Lời mời</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`flex-1 px-6 py-4 font-semibold rounded-xl transition-all duration-300 ${
                activeTab === "search"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-[1.02] shadow-indigo-200"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:scale-[1.01]"
              }`}
            >
              <span className="flex items-center justify-center space-x-3">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Tìm kiếm</span>
              </span>
            </button>
          </div>
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
    </div>
  );
}
