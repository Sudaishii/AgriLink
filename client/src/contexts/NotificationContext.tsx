import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Notification } from '../types';
import { API_BASE_URL, getStoredAuthToken } from '../api/apiConfig';
import { getSocket, initSocket } from '../services/socketService';

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string | number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [authTick, setAuthTick] = useState(0);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status === 'unread').length,
    [notifications]
  );

  const refreshNotifications = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data?.notifications) ? data.notifications : Array.isArray(data) ? data : [];
        const mapped: Notification[] = rows.map((r: any) => ({
          id: r?.n_id ?? r?.id,
          title: String(r?.title ?? 'Notification'),
          message: String(r?.message ?? ''),
          type: (r?.type ?? 'system') as 'order' | 'message' | 'system',
          status: (r?.status ?? 'unread') as 'unread' | 'read',
          timestamp: r?.created_at ? new Date(r.created_at).toLocaleString() : '',
          link: r?.link ?? undefined,
          userId: String(r?.u_id ?? ''),
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string | number) => {
    const token = getStoredAuthToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (String(n.id) === String(id) ? { ...n, status: 'read' as const } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' as const })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/notifications/all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }, []);

  const addNotification = useCallback((row: any) => {
    const id = row?.n_id ?? row?.id;
    const type = String(row?.type ?? 'system').toLowerCase();
    const title = String(row?.title ?? '');

    // 🚀 Restore real-time order updates
    if (type === 'order') {
      window.dispatchEvent(new CustomEvent('order-updated'));
      if (title.toLowerCase().includes('new order')) {
        window.dispatchEvent(new CustomEvent('agrilink-new-order', { detail: row }));
      }
    }

    setNotifications((prev) => {
      if (id != null && prev.some((n) => String(n.id) === String(id))) return prev;
      const next: Notification = {
        id,
        title: String(row?.title ?? 'Notification'),
        message: String(row?.message ?? ''),
        type: (row?.type ?? 'system') as 'order' | 'message' | 'system',
        status: (row?.status ?? 'unread') as 'unread' | 'read',
        timestamp: row?.created_at ? new Date(row.created_at).toLocaleString() : new Date().toLocaleString(),
        link: row?.link ?? undefined,
        userId: String(row?.u_id ?? ''),
      };
      return [next, ...prev];
    });
  }, []);

  const markByLinkRealtime = useCallback((payload: any) => {
    const link = String(payload?.link || '').trim();
    if (!link) return;

    setNotifications((prev) =>
      prev.map((n) => (n.link === link ? { ...n, status: 'read' as const } : n))
    );
  }, []);

  useEffect(() => {
    const token = getStoredAuthToken();
    const isLoggedIn = localStorage.getItem('agrilink_isLoggedIn') === 'true';
    if (!token || !isLoggedIn) {
      setNotifications([]);
      return;
    }

    initSocket(token);
    refreshNotifications();

    const socket = getSocket();
    if (!socket) return;

    socket.on('new_notification', addNotification);
    socket.on('notifications_read_by_link', markByLinkRealtime);
    return () => {
      socket.off('new_notification', addNotification);
      socket.off('notifications_read_by_link', markByLinkRealtime);
    };
  }, [refreshNotifications, addNotification, markByLinkRealtime, authTick]);

  useEffect(() => {
    const bump = () => setAuthTick((v) => v + 1);
    window.addEventListener('agrilink-auth-changed', bump);
    return () => window.removeEventListener('agrilink-auth-changed', bump);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
      clearAll,
    }),
    [notifications, unreadCount, loading, refreshNotifications, markAsRead, markAllAsRead, clearAll]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
}