import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation, Message } from '../types';
import { fetchConversations, fetchMessages, markThreadRead, sendMessage, markAllMessagesRead } from '../api/messages';
import { getStoredAuthToken } from '../api/apiConfig';
import { disconnectSocket, getSocket, initSocket } from '../services/socketService';

type MessagingContextValue = {
  conversations: Conversation[];
  unreadTotal: number;
  isReady: boolean;
  error: string | null;
  threadsVersion: number;
  refreshConversations: () => Promise<void>;
  getThreadMessages: (otherUserId: number) => Promise<Message[]>;
  refreshThreadMessages: (otherUserId: number) => Promise<Message[]>;
  getCachedThread: (otherUserId: number) => Message[] | undefined;
  sendTextMessage: (otherUserId: number, content: string) => Promise<void>;
  sendChatMessage: (otherUserId: number, content: string, image?: File | null) => Promise<void>;
  ensureConversation: (conversation: Conversation) => void;
  markRead: (otherUserId: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  isUserOnline: (userId: string | number) => boolean;
};

const MessagingContext = createContext<MessagingContextValue | null>(null);

function initials(first: string, last: string) {
  const a = String(first || '').trim()[0] || '';
  const b = String(last || '').trim()[0] || '';
  const out = `${a}${b}`.toUpperCase();
  return out || '?';
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function mapConversationRow(row: any): Conversation {
  const pid = Number(row?.participantId);
  const first = String(row?.first_name ?? '').trim();
  const last = String(row?.last_name ?? '').trim();
  const role = String(row?.role ?? '').trim();
  const unread = Number(row?.unreadCount ?? 0) || 0;

  return {
    id: String(pid),
    participantId: String(pid),
    participantName: `${first} ${last}`.trim() || `User ${pid}`,
    participantType: role || 'user',
    participantImage: row?.profile_image || row?.image_path || initials(first, last),
    lastMessage: String(row?.lastMessage ?? '').trim(),
    lastMessageTime: formatTime(row?.lastMessageTime ?? null),
    unreadCount: unread,
  };
}

function mapMessageRow(row: any): Message {
  const mid = Number(row?.m_id);
  const sender = Number(row?.sender_id);
  const receiver = Number(row?.receiver_id);
  const createdAt = String(row?.created_at ?? '');
  const isReadRaw = row?.is_read;

  return {
    id: String(mid || createdAt || Math.random()),
    senderId: String(sender),
    receiverId: String(receiver),
    content: String(row?.content ?? ''),
    imagePath: row?.image_path,
    timestamp: formatTime(createdAt),
    isRead: Boolean(isReadRaw === 1 || isReadRaw === true),
  };
}

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadsVersion, setThreadsVersion] = useState(0);
  const [authTick, setAuthTick] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  // Cache message threads by other user id.
  const threadsRef = useRef<Map<number, Message[]>>(new Map());

  const unreadTotal = useMemo(
    () => conversations.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0),
    [conversations]
  );

  const mergeConversations = useCallback((serverRows: Conversation[], existingRows: Conversation[]) => {
    const seen = new Set(serverRows.map((c) => c.participantId));
    const extras = existingRows.filter((c) => {
      if (seen.has(c.participantId)) return false;
      const hasUnread = Number(c.unreadCount || 0) > 0;
      const hasMessage = String(c.lastMessage || '').trim().length > 0;
      // Drop placeholder/empty local conversations that were never actually messaged.
      return hasUnread || hasMessage;
    });
    return [...serverRows, ...extras];
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      setError(null);
      const rows = await fetchConversations();
      const serverMapped = rows.map(mapConversationRow);
      setConversations((prev) => mergeConversations(serverMapped, prev));
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh conversations');
    }
  }, [mergeConversations]);

  const getCachedThread = useCallback((otherUserId: number) => {
    return threadsRef.current.get(otherUserId);
  }, []);

  const getThreadMessages = useCallback(async (otherUserId: number) => {
    const cached = threadsRef.current.get(otherUserId);
    if (cached) return cached;

    const rows = await fetchMessages(otherUserId);
    const mapped = rows.map(mapMessageRow);
    threadsRef.current.set(otherUserId, mapped);
    setThreadsVersion((v) => v + 1);
    return mapped;
  }, []);

  const refreshThreadMessages = useCallback(async (otherUserId: number) => {
    const rows = await fetchMessages(otherUserId);
    const mapped = rows.map(mapMessageRow);
    threadsRef.current.set(otherUserId, mapped);
    setThreadsVersion((v) => v + 1);
    return mapped;
  }, []);

  const upsertMessage = useCallback((row: any) => {
    const msg = mapMessageRow(row);
    const sender = Number(row?.sender_id);
    const receiver = Number(row?.receiver_id);
    if (!Number.isFinite(sender) || !Number.isFinite(receiver)) return;

    const myIdRaw = localStorage.getItem('agrilink_id');
    const myId = Number(myIdRaw);
    const otherUserId = sender === myId ? receiver : sender;

    const current = threadsRef.current.get(otherUserId) ?? [];
    // Dedupe by id (m_id) when present.
    const exists = current.some((m) => m.id === msg.id);
    const next = exists ? current : [...current, msg];
    threadsRef.current.set(otherUserId, next);
    if (!exists) setThreadsVersion((v) => v + 1);

    // Update conversations list (last message + unread).
    setConversations((prev) => {
      const otherIdStr = String(otherUserId);
      const isIncoming = receiver === myId;
      let found = false;
      const updated = prev.map((c) => {
        if (c.participantId !== otherIdStr) return c;
        found = true;
        return {
          ...c,
          lastMessage: msg.imagePath ? (msg.content ? `[[image]] ${msg.content}` : '[[image]]') : (msg.content || c.lastMessage),
          lastMessageTime: msg.timestamp || c.lastMessageTime,
          unreadCount: isIncoming ? (Number(c.unreadCount) || 0) + 1 : c.unreadCount,
        };
      });

      if (found) {
        // Move updated conversation to the top.
        const idx = updated.findIndex((c) => c.participantId === otherIdStr);
        if (idx > 0) {
          const [conv] = updated.splice(idx, 1);
          updated.unshift(conv);
        }
        return updated;
      }

      // If we don't have a conversation row yet, refresh from server to avoid guessing metadata.
      refreshConversations().catch(() => null);
      return prev;
    });
  }, [refreshConversations]);

  const sendTextMessage = useCallback(async (otherUserId: number, content: string) => {
    const text = String(content || '').trim();
    if (!text) return;
    const row = await sendMessage(otherUserId, text);
    // REST response + socket echo can both arrive; upsert handles dedupe.
    upsertMessage(row);
  }, [upsertMessage]);

  const sendChatMessage = useCallback(async (otherUserId: number, content: string, image?: File | null) => {
    const row = await sendMessage(otherUserId, content, image);
    upsertMessage(row);
  }, [upsertMessage]);

  const ensureConversation = useCallback((conversation: Conversation) => {
    const participantId = String(conversation.participantId || '').trim();
    if (!participantId) return;

    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.participantId === participantId);
      if (idx >= 0) {
        const existing = prev[idx];
        const merged: Conversation = {
          ...existing,
          participantName: conversation.participantName || existing.participantName,
          participantType: conversation.participantType || existing.participantType,
          participantImage: conversation.participantImage || existing.participantImage,
          lastMessage: existing.lastMessage || conversation.lastMessage || '',
          lastMessageTime: existing.lastMessageTime || conversation.lastMessageTime || '',
          unreadCount: Number.isFinite(Number(existing.unreadCount))
            ? existing.unreadCount
            : (conversation.unreadCount || 0),
        };
        if (idx === 0) return [merged, ...prev.slice(1)];
        const clone = [...prev];
        clone.splice(idx, 1);
        clone.unshift(merged);
        return clone;
      }
      return [{ ...conversation, participantId, id: conversation.id || participantId }, ...prev];
    });
  }, []);

  const markRead = useCallback(async (otherUserId: number) => {
    // Optimistic update
    setConversations((prev) =>
      prev.map((c) => (c.participantId === String(otherUserId) ? { ...c, unreadCount: 0 } : c))
    );
    try {
      await markThreadRead(otherUserId);
    } catch (err) {
      console.error('Failed to mark thread as read on server', err);
    }
    setThreadsVersion((v) => v + 1);
  }, []);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setConversations((prev) => prev.map((c) => ({ ...c, unreadCount: 0 })));
    try {
      await markAllMessagesRead();
    } catch (err) {
      console.error('Failed to mark all messages as read on server', err);
    }
    setThreadsVersion((v) => v + 1);
  }, []);

  const isUserOnline = useCallback((userId: string | number) => {
    return onlineUsers.has(Number(userId));
  }, [onlineUsers]);

  // Init socket + initial conversations when token exists.
  useEffect(() => {
    const token = getStoredAuthToken();
    const isLoggedIn = localStorage.getItem('agrilink_isLoggedIn') === 'true';
    if (!token || !isLoggedIn) {
      disconnectSocket();
      setIsReady(false);
      setConversations([]);
      threadsRef.current.clear();
      return;
    }

    initSocket(token);
    refreshConversations().finally(() => setIsReady(true));

    const socket = getSocket();
    if (!socket) return;

    const handler = (row: any) => upsertMessage(row);
    socket.on('new_message', handler);

    // Initial fetch of online users
    socket.emit('get_online_users', (ids: number[]) => {
      setOnlineUsers(new Set(ids));
    });

    const statusHandler = ({ userId, status }: { userId: number; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return next;
      });
    };
    socket.on('user_status', statusHandler);

    return () => {
      socket.off('new_message', handler);
      socket.off('user_status', statusHandler);
    };
  }, [refreshConversations, upsertMessage, authTick]);

  // Re-run auth-dependent initialization on explicit app auth changes.
  useEffect(() => {
    const bump = () => setAuthTick((v) => v + 1);
    window.addEventListener('agrilink-auth-changed', bump);
    return () => window.removeEventListener('agrilink-auth-changed', bump);
  }, []);

  const value: MessagingContextValue = useMemo(
    () => ({
      conversations,
      unreadTotal,
      isReady,
      error,
      threadsVersion,
      refreshConversations,
      getThreadMessages,
      refreshThreadMessages,
      getCachedThread,
      sendTextMessage,
      sendChatMessage,
      ensureConversation,
      markRead,
      markAllRead,
      isUserOnline,
    }),
    [
      conversations,
      unreadTotal,
      isReady,
      error,
      threadsVersion,
      refreshConversations,
      getThreadMessages,
      refreshThreadMessages,
      getCachedThread,
      sendTextMessage,
      sendChatMessage,
      ensureConversation,
      markRead,
      markAllRead,
      isUserOnline,
    ]
);

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within a MessagingProvider');
  return ctx;
}
