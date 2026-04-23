"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const database_1 = require("../database/database");
const socket_1 = require("../socket");
let notificationColumnsReady = false;
const ensureNotificationPreferenceColumns = async () => {
    if (notificationColumnsReady)
        return;
    await database_1.db.execute("ALTER TABLE users_table ADD COLUMN IF NOT EXISTS notify_orders TINYINT(1) NOT NULL DEFAULT 1");
    await database_1.db.execute("ALTER TABLE users_table ADD COLUMN IF NOT EXISTS notify_messages TINYINT(1) NOT NULL DEFAULT 1");
    notificationColumnsReady = true;
};
const getUserAlertPreferences = async (userId) => {
    try {
        await ensureNotificationPreferenceColumns();
        const [rows] = await database_1.db.execute(`SELECT COALESCE(notify_orders, 1) AS notify_orders, COALESCE(notify_messages, 1) AS notify_messages
       FROM users_table
       WHERE id = ?
       LIMIT 1`, [userId]);
        const row = rows?.[0];
        if (!row)
            return { orders: true, messages: true };
        return {
            orders: Number(row.notify_orders) === 1,
            messages: Number(row.notify_messages) === 1,
        };
    }
    catch {
        // Fail-open so notification flow remains available if schema migration fails.
        return { orders: true, messages: true };
    }
};
const shouldCreateNotification = async (userId, type) => {
    if (type === 'system')
        return true;
    const prefs = await getUserAlertPreferences(userId);
    if (type === 'order')
        return prefs.orders;
    if (type === 'message')
        return prefs.messages;
    return true;
};
exports.notificationService = {
    ensureNotificationPreferenceColumns,
    getNotificationsByUserId: async (userId) => {
        const [rows] = await database_1.db.query('SELECT * FROM notifications_table WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return rows;
    },
    markAllAsRead: async (userId) => {
        const [result] = await database_1.db.query("UPDATE notifications_table SET status = 'read' WHERE user_id = ? AND status = 'unread'", [userId]);
        return result;
    },
    markAsRead: async (notificationId, userId) => {
        const [result] = await database_1.db.query("UPDATE notifications_table SET status = 'read' WHERE n_id = ? AND user_id = ?", [notificationId, userId]);
        return result;
    },
    deleteNotification: async (notificationId, userId) => {
        const [result] = await database_1.db.query('DELETE FROM notifications_table WHERE n_id = ? AND user_id = ?', [notificationId, userId]);
        return result;
    },
    createNotification: async (userId, title, message, type, link) => {
        const allowed = await shouldCreateNotification(userId, type);
        if (!allowed)
            return null;
        const safeTitle = title.length > 100 ? title.substring(0, 97) + '...' : title;
        const safeMessage = message.length > 255 ? message.substring(0, 252) + '...' : message;
        const [result] = await database_1.db.query('INSERT INTO notifications_table (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)', [userId, safeTitle, safeMessage, type, link ?? null]);
        const insertedId = Number(result?.insertId);
        if (Number.isFinite(insertedId) && insertedId > 0) {
            const [rows] = await database_1.db.query('SELECT * FROM notifications_table WHERE n_id = ? LIMIT 1', [insertedId]);
            if (Array.isArray(rows) && rows[0]) {
                (0, socket_1.emitToUser)(userId, 'new_notification', rows[0]);
            }
        }
        return result;
    },
    deleteAllForUser: async (userId) => {
        const [result] = await database_1.db.query('DELETE FROM notifications_table WHERE user_id = ?', [userId]);
        return result;
    },
    markNotificationsAsReadByLink: async (userId, link) => {
        const [result] = await database_1.db.query("UPDATE notifications_table SET status = 'read' WHERE user_id = ? AND link = ? AND status = 'unread'", [userId, link]);
        return result;
    }
};
