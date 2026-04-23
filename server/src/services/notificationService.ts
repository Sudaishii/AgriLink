import { db } from '../database/database';
import { emitToUser } from '../socket';

type NotificationType = 'order' | 'message' | 'system';

type UserAlertPreferences = {
  orders: boolean;
  messages: boolean;
};

let notificationColumnsReady = false;

const ensureNotificationPreferenceColumns = async (): Promise<void> => {
  if (notificationColumnsReady) return;

  await db.execute(
    "ALTER TABLE users_table ADD COLUMN IF NOT EXISTS notify_orders TINYINT(1) NOT NULL DEFAULT 1"
  );
  await db.execute(
    "ALTER TABLE users_table ADD COLUMN IF NOT EXISTS notify_messages TINYINT(1) NOT NULL DEFAULT 1"
  );
  notificationColumnsReady = true;
};

const getUserAlertPreferences = async (userId: number): Promise<UserAlertPreferences> => {
  try {
    await ensureNotificationPreferenceColumns();
    const [rows]: any = await db.execute(
      `SELECT COALESCE(notify_orders, 1) AS notify_orders, COALESCE(notify_messages, 1) AS notify_messages
       FROM users_table
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );
    const row = rows?.[0];
    if (!row) return { orders: true, messages: true };
    return {
      orders: Number(row.notify_orders) === 1,
      messages: Number(row.notify_messages) === 1,
    };
  } catch {
    // Fail-open so notification flow remains available if schema migration fails.
    return { orders: true, messages: true };
  }
};

const shouldCreateNotification = async (userId: number, type: NotificationType): Promise<boolean> => {
  if (type === 'system') return true;
  const prefs = await getUserAlertPreferences(userId);
  if (type === 'order') return prefs.orders;
  if (type === 'message') return prefs.messages;
  return true;
};

export const notificationService = {
  ensureNotificationPreferenceColumns,

  getNotificationsByUserId: async (userId: number) => {
    const [rows] = await db.query(
      'SELECT * FROM notifications_table WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  markAllAsRead: async (userId: number) => {
    const [result] = await db.query(
      "UPDATE notifications_table SET status = 'read' WHERE user_id = ? AND status = 'unread'",
      [userId]
    );
    return result;
  },

  markAsRead: async (notificationId: number, userId: number) => {
    const [result] = await db.query(
      "UPDATE notifications_table SET status = 'read' WHERE n_id = ? AND user_id = ?",
      [notificationId, userId]
    );
    return result;
  },

  deleteNotification: async (notificationId: number, userId: number) => {
    const [result] = await db.query(
      'DELETE FROM notifications_table WHERE n_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return result;
  },

  createNotification: async (userId: number, title: string, message: string, type: NotificationType, link?: string) => {
    const allowed = await shouldCreateNotification(userId, type);
    if (!allowed) return null;

    const safeTitle = title.length > 100 ? title.substring(0, 97) + '...' : title;
    const safeMessage = message.length > 255 ? message.substring(0, 252) + '...' : message;
    const [result]: any = await db.query(
      'INSERT INTO notifications_table (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      [userId, safeTitle, safeMessage, type, link ?? null]
    );

    const insertedId = Number(result?.insertId);
    if (Number.isFinite(insertedId) && insertedId > 0) {
      const [rows]: any = await db.query(
        'SELECT * FROM notifications_table WHERE n_id = ? LIMIT 1',
        [insertedId]
      );
      if (Array.isArray(rows) && rows[0]) {
        emitToUser(userId, 'new_notification', rows[0]);
      }
    }

    return result;
  },

  deleteAllForUser: async (userId: number) => {
    const [result] = await db.query('DELETE FROM notifications_table WHERE user_id = ?', [userId]);
    return result;
  },

  markNotificationsAsReadByLink: async (userId: number, link: string) => {
    const [result] = await db.query(
      "UPDATE notifications_table SET status = 'read' WHERE user_id = ? AND link = ? AND status = 'unread'",
      [userId, link]
    );
    return result;
  }
};
