import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth.jsx';
import { useSocket } from './socket.jsx';
import { notificationApi } from '../utils/api.js';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshUnread = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Use list endpoint to retrieve unread count
      const { data } = await notificationApi.list(null, 1, token);
      const unread = data?.data?.unread ?? data?.unread ?? 0;
      setUnreadCount(unread);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    try {
      await notificationApi.markAll(token);
      setUnreadCount(0);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    refreshUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const onNew = () => setUnreadCount((c) => c + 1);
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [socket]);

  return (
    <NotificationsContext.Provider
      value={{ unreadCount, setUnreadCount, refreshUnread, markAllRead, loading }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
