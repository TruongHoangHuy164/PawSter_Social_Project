import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../state/auth.jsx';
import { useSocket } from '../../state/socket.jsx';
import { useNotifications } from '../../state/notifications.jsx';
import { notificationApi } from '../../utils/api.js';

function typeToText(t) {
  switch (t) {
    case 'friend_accepted': return 'đã chấp nhận lời mời kết bạn';
    case 'follow': return 'đã theo dõi bạn';
    case 'comment': return 'đã bình luận bài viết của bạn';
    case 'like_thread': return 'đã thích nội dung của bạn';
    case 'like_comment': return 'đã thích bình luận của bạn';
    case 'repost_thread': return 'đã chia sẻ lại bài viết của bạn';
    default: return 'đã tương tác';
  }
}

export default function Notification() {
  const { token } = useAuth();
  const { socket } = useSocket();
  const { unreadCount, setUnreadCount, markAllRead } = useNotifications();
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (next) => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await notificationApi.list(next ? cursor : null, 20, token);
      const newItems = data?.data?.items || data?.items || [];
      const nextCursor = data?.data?.nextCursor || data?.nextCursor || null;
  const unread = data?.data?.unread ?? data?.unread ?? 0;
  setUnreadCount(unread);
      setItems((prev) => next ? [...prev, ...newItems] : newItems);
      setCursor(nextCursor);
    } catch (e) {
      console.error('Load notifications failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(false); }, [token]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      const n = payload?.notification;
      if (!n) return;
      setItems((prev) => [n, ...prev]);
  setUnreadCount((u) => u + 1);
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket]);

  const markAll = async () => {
    try {
      await markAllRead();
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Thông báo</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">Chưa đọc: {unreadCount}</span>
          <button onClick={markAll} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500">Đánh dấu đã đọc</button>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        {items.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chưa có thông báo</div>
        )}
        {items.map((n) => (
          <div key={n._id} className={`p-4 flex items-start gap-3 ${!n.read ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg">🔔</div>
            <div className="flex-1">
              <div className="text-sm">
                <span className="font-semibold">{n.actor?.username || 'Ai đó'}</span> {typeToText(n.type)}
              </div>
              {n.thread?.content && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{n.thread.content}</div>
              )}
              {n.comment?.content && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">Bình luận: {n.comment.content}</div>
              )}
              <div className="text-[11px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {cursor && (
        <div className="text-center">
          <button disabled={loading} onClick={() => load(true)} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50">
            {loading ? 'Đang tải...' : 'Tải thêm'}
          </button>
        </div>
      )}
    </div>
  );
}