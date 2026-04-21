import { db } from '../database/database';
import { emitToUser } from '../socket';

export const notificationService = {
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

  createNotification: async (userId: number, title: string, message: string, type: 'order' | 'message' | 'system', link?: string) => {
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
