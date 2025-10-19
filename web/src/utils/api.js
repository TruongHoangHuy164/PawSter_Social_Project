// Prefer same-origin '/api' via Vite proxy when VITE_API_URL not provided.
// This allows accessing the app from any LAN IP without editing env.
const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, method = "GET", body, token) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    err.data = data; // include full server payload for debugging (e.g., MoMo subErrors)
    throw err;
  }
  return { status: res.status, data };
}

export const api = {
  get: (p, t) => request(p, "GET", undefined, t),
  post: (p, b, t) => request(p, "POST", b, t),
  del: (p, t) => request(p, "DELETE", undefined, t),
  patch: (p, b, t) => request(p, "PATCH", b, t),
  rawPatch: (p, formData, t) => request(p, "PATCH", formData, t),
};

export const authApi = {
  requestPasswordOtp: (token) => request('/auth/password/otp', 'POST', undefined, token),
  changePasswordWithOtp: ({ otp, newPassword }, token) => request('/auth/password/change', 'POST', { otp, newPassword }, token),
};

// Messages API
export const dmApi = {
  listConversations: (token) =>
    request("/messages/conversations", "GET", undefined, token),
  getOrCreate: (otherId, token) =>
    request(
      `/messages/conversations/with/${otherId}`,
      "POST",
      undefined,
      token
    ),
  listMessages: (conversationId, page = 1, limit = 30, token) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return request(
      `/messages/conversations/${conversationId}/messages?${params.toString()}`,
      "GET",
      undefined,
      token
    );
  },
  send: (conversationId, { to, content, files }, token) => {
    if (files && files.length) {
      const fd = new FormData();
      if (to) fd.append("to", to);
      if (content) fd.append("content", content);
      files.forEach((f) => fd.append("media", f));
      return request(
        `/messages/conversations/${conversationId}/messages`,
        "POST",
        fd,
        token
      );
    }
    return request(
      `/messages/conversations/${conversationId}/messages`,
      "POST",
      { to, content },
      token
    );
  },
  markRead: (conversationId, token) =>
    request(
      `/messages/conversations/${conversationId}/read`,
      "POST",
      undefined,
      token
    ),
};

// Comment API functions
export const commentApi = {
  // Create a new comment
  createComment: (commentData, token) => {
    const { threadId, content, parentId, files } = commentData;

    if (files && files.length > 0) {
      const formData = new FormData();
      if (content) formData.append("content", content);
      if (threadId) formData.append("threadId", threadId);
      if (parentId) formData.append("parentId", parentId);
      files.forEach((file) => formData.append("media", file));
      return request("/comments", "POST", formData, token);
    } else {
      return request(
        "/comments",
        "POST",
        { threadId, content, parentId },
        token
      );
    }
  },

  // Get comments for a thread
  getComments: (threadId, page = 1, limit = 20, parentId = null, token) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (parentId) params.append("parentId", parentId);
    return request(
      `/comments/thread/${threadId}?${params}`,
      "GET",
      undefined,
      token
    );
  },

  // Get replies for a comment
  getReplies: (commentId, page = 1, limit = 10, token) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return request(
      `/comments/${commentId}/replies?${params}`,
      "GET",
      undefined,
      token
    );
  },

  // Update a comment
  updateComment: (commentId, content, token) => {
    return request(`/comments/${commentId}`, "PATCH", { content }, token);
  },

  // Delete a comment
  deleteComment: (commentId, token) => {
    return request(`/comments/${commentId}`, "DELETE", undefined, token);
  },

  // Like/Unlike a comment
  toggleLike: (commentId, token) => {
    return request(`/comments/${commentId}/like`, "POST", undefined, token);
  },
};

// Thread API functions
export const threadApi = {
  // Like a thread
  likeThread: (threadId, token) => {
    return request(`/threads/${threadId}/like`, "POST", undefined, token);
  },

  // Unlike a thread
  unlikeThread: (threadId, token) => {
    return request(`/threads/${threadId}/like`, "DELETE", undefined, token);
  },

  // Repost a thread
  repostThread: (threadId, token) => {
    return request(`/threads/${threadId}/repost`, "POST", undefined, token);
  },

  // Unrepost a thread
  unrepostThread: (threadId, token) => {
    return request(`/threads/${threadId}/repost`, "DELETE", undefined, token);
  },

  // Get user's favorite threads
  getFavorites: (userId, token) => {
    return request(`/threads/favorites/${userId}`, "GET", undefined, token);
  },

  // Get user's reposted threads
  getReposts: (userId, token) => {
    return request(`/threads/reposts/${userId}`, "GET", undefined, token);
  },
};

// User API functions
export const userApi = {
  // Get user by ID (public profile)
  getUserById: (userId, token) => {
    return request(`/users/${userId}`, "GET", undefined, token);
  },

  // Follow a user
  followUser: (userId, token) => {
    return request(`/users/${userId}/follow`, "POST", undefined, token);
  },

  // Unfollow a user
  unfollowUser: (userId, token) => {
    return request(`/users/${userId}/follow`, "DELETE", undefined, token);
  },
};
