import { useState, useEffect } from "react";
import { useAuth } from "../../state/auth";
import { api } from "../../utils/api";
import Avatar from "../../ui/Avatar";

export default function FriendRequests() {
  const { user, token } = useAuth();
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("received");

  useEffect(() => {
    if (user && token) {
      fetchRequests();
    }
  }, [user, token]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log(
        "🔍 Fetching requests with token:",
        token ? "✅ Token exists" : "❌ No token"
      );
      console.log("👤 Current user:", user?._id);

      const [receivedRes, sentRes] = await Promise.all([
        api.get("/users/friends/requests/received", token),
        api.get("/users/friends/requests/sent", token),
      ]);

      console.log("📥 Received requests response:", receivedRes);
      console.log("📤 Sent requests response:", sentRes);

      setReceivedRequests(receivedRes.data.data || []);
      setSentRequests(sentRes.data.data || []);

      console.log(
        "📊 Final state - Received:",
        receivedRes.data.data?.length || 0
      );
      console.log("📊 Final state - Sent:", sentRes.data.data?.length || 0);
    } catch (error) {
      console.error("❌ Error fetching requests:", error);
      console.error("❌ Error status:", error.status);
      console.error("❌ Error data:", error.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.post(`/users/friends/${requestId}/accept`, {}, token);
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.post(`/users/friends/${requestId}/reject`, {}, token);
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await api.delete(`/users/friends/${requestId}/cancel`, token);
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error("Error cancelling request:", error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lời mời kết bạn</h1>
          <p className="text-sm text-neutral-400">
            Quản lý các yêu cầu kết bạn đến và đã gửi
          </p>
        </div>
        <div>
          <div className="inline-flex items-center bg-neutral-800 px-3 py-1.5 rounded-full text-sm text-neutral-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
            {receivedRequests.length} nhận • {sentRequests.length} đã gửi
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 border-b border-neutral-700">
        <button
          onClick={() => setActiveTab("received")}
          className={`px-4 py-2 font-medium ${
            activeTab === "received"
              ? "text-violet-400 border-b-2 border-violet-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Đã nhận ({receivedRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`px-4 py-2 font-medium ml-4 ${
            activeTab === "sent"
              ? "text-violet-400 border-b-2 border-violet-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Đã gửi ({sentRequests.length})
        </button>
      </div>

      {/* Received Requests */}
      {activeTab === "received" && (
        <div>
          {receivedRequests.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-16 w-16 text-neutral-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <div className="text-lg font-medium text-neutral-200">
                Không có lời mời kết bạn
              </div>
              <div className="text-sm text-neutral-500 mt-2">
                Khi ai đó gửi lời mời, bạn sẽ thấy ở đây.
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {receivedRequests.map((request) => (
                <div
                  key={request._id}
                  className="p-4 bg-[linear-gradient(180deg,#071025,transparent)] border border-neutral-800 rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar user={request.from} size="lg" />
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        {request.from.username}
                      </h3>
                      <p className="text-sm text-neutral-400">
                        {request.from.email}
                      </p>
                      <div className="mt-1">
                        {request.from.isPro && (
                          <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded">
                            PRO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAcceptRequest(request._id)}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-md text-sm transition-colors"
                      aria-label={`Chấp nhận lời mời từ ${request.from.username}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414L8.414 15 4.293 10.879a1 1 0 10-1.414 1.414l5 5a1 1 0 001.414 0l9-9a1 1 0 00-1.414-1.414L8.414 14.586 5.121 11.293a1 1 0 10-1.414 1.414l4.707 4.707a1 1 0 001.414 0l9-9a1 1 0 000-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Chấp nhận
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request._id)}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-red-400 border border-neutral-700 rounded-md text-sm transition-colors"
                      aria-label={`Từ chối lời mời từ ${request.from.username}`}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sent Requests */}
      {activeTab === "sent" && (
        <div>
          {sentRequests.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-16 w-16 text-neutral-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h4l3 8 4-16 3 8h4"
                />
              </svg>
              <div className="text-lg font-medium text-neutral-200">
                Chưa gửi lời mời nào
              </div>
              <div className="text-sm text-neutral-500 mt-2">
                Bạn có thể tìm và gửi lời mời cho người dùng khác.
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {sentRequests.map((request) => (
                <div
                  key={request._id}
                  className="p-4 bg-[linear-gradient(180deg,#071025,transparent)] border border-neutral-800 rounded-lg flex items-center justify-between hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar user={request.to} size="lg" />
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        {request.to.username}
                      </h3>
                      <p className="text-sm text-neutral-400">
                        {request.to.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-yellow-400">Đang chờ...</span>
                    <button
                      onClick={() => handleCancelRequest(request._id)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md text-sm"
                      aria-label={`Hủy yêu cầu gửi tới ${request.to.username}`}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
