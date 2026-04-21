"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const database_1 = require("../database/database");
const socket_1 = require("../socket");
exports.notificationService = {
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
