import { API_BASE_URL, getStoredAuthToken } from './apiConfig';

type ApiConversationRow = {
  participantId: number;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string | null;
  peerLastSessionAt?: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number | string | null;
};

type ApiMessageRow = {
  m_id: number;
  sender_id: number;
  receiver_id: number;
  content: string | null;
  image_path?: string | null;
  is_read: number | boolean | null;
  created_at: string;
};

const authHeaders = (): Record<string, string> => {
  const token = getStoredAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export async function fetchConversations(): Promise<ApiConversationRow[]> {
  const res = await fetch(`${API_BASE_URL}/messages`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to load conversations (${res.status})`);
  const data = await res.json();
  return (data?.conversations ?? []) as ApiConversationRow[];
}

export async function fetchMessages(otherUserId: number): Promise<ApiMessageRow[]> {
  const res = await fetch(`${API_BASE_URL}/messages/${otherUserId}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
  const data = await res.json();
  return (data?.messages ?? []) as ApiMessageRow[];
}

export async function sendMessage(receiverId: number, content: string, image?: File | null): Promise<ApiMessageRow> {
  const hasImage = image instanceof File;
  const headers = { ...authHeaders() } as Record<string, string>;
  const body: BodyInit = hasImage
    ? (() => {
      const form = new FormData();
      form.append('receiverId', String(receiverId));
      form.append('content', String(content || ''));
      form.append('image', image);
      return form;
    })()
    : JSON.stringify({ receiverId, content });

  if (!hasImage) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}/messages`, {
    method: 'POST',
    headers,
    body,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Failed to send message (${res.status})`);
  }
  const data = await res.json();
  return data?.data as ApiMessageRow;
}

export async function markThreadRead(otherUserId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/messages/${otherUserId}/read`, {
    method: 'PUT',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to mark read (${res.status})`);
}

export async function markAllMessagesRead(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/messages/read-all`, {
    method: 'PUT',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Failed to mark all read (${res.status})`);
}

export type { ApiConversationRow, ApiMessageRow };
