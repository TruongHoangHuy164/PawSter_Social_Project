import { useState, useEffect } from "react";
import { useAuth } from "../../state/auth";
import { api } from "../../utils/api";
import Avatar from "../../ui/Avatar";
// add friend
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
      <div className="container mx-auto p-4">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Lời mời kết bạn</h1>

      {/* Tabs */}
      <div className="flex mb-6 border-b border-neutral-700">
        <button
          onClick={() => setActiveTab("received")}
          className={`px-4 py-2 font-medium ${
            activeTab === "received"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Đã nhận ({receivedRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`px-4 py-2 font-medium ml-4 ${
            activeTab === "sent"
              ? "text-blue-400 border-b-2 border-blue-400"
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
            <div className="text-center py-8 text-neutral-500">
              Không có lời mời kết bạn nào
            </div>
          ) : (
            <div className="space-y-4">
              {receivedRequests.map((request) => (
                <div key={request._id} className="card p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar user={request.from} size="md" />
                      <div>
                        <h3 className="font-medium">{request.from.username}</h3>
                        <p className="text-sm text-neutral-400">
                          {request.from.email}
                        </p>
                        {request.from.isPro && (
                          <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">
                            PRO
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptRequest(request._id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                      >
                        Chấp nhận
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request._id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                      >
                        Từ chối
                      </button>
                    </div>
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
            <div className="text-center py-8 text-neutral-500">
              Chưa gửi lời mời kết bạn nào
            </div>
          ) : (
            <div className="space-y-4">
              {sentRequests.map((request) => (
                <div key={request._id} className="card p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar user={request.to} size="md" />
                      <div>
                        <h3 className="font-medium">{request.to.username}</h3>
                        <p className="text-sm text-neutral-400">
                          {request.to.email}
                        </p>
                        {request.to.isPro && (
                          <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">
                            PRO
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-yellow-400">
                        Đang chờ...
                      </span>
                      <button
                        onClick={() => handleCancelRequest(request._id)}
                        className="px-3 py-1.5 bg-neutral-600 hover:bg-neutral-700 text-white rounded text-sm transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
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
