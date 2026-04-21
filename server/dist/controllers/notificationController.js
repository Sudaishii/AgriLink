"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllNotifications = exports.deleteNotification = exports.markAsRead = exports.markAllAsRead = exports.getNotifications = void 0;
const notificationService_1 = require("../services/notificationService");
const messageService_1 = require("../services/messageService");
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await notificationService_1.notificationService.getNotificationsByUserId(userId);
        let unreadMessageTotal = 0;
        let recentConversations = [];
        try {
            const conversations = (await messageService_1.messageService.getConversations(userId));
            const convs = Array.isArray(conversations) ? conversations : [];
            unreadMessageTotal = convs.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0);
            recentConversations = convs.slice(0, 5);
        }
        catch (msgErr) {
            console.error('[getNotifications] message snapshot failed', msgErr);
        }
        res.json({ notifications, unreadMessageTotal, recentConversations });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getNotifications = getNotifications;
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await notificationService_1.notificationService.markAllAsRead(userId);
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markAllAsRead = markAllAsRead;
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        await notificationService_1.notificationService.markAsRead(Number(id), userId);
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markAsRead = markAsRead;
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        await notificationService_1.notificationService.deleteNotification(Number(id), userId);
        res.json({ message: 'Notification deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteNotification = deleteNotification;
const deleteAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        await notificationService_1.notificationService.deleteAllForUser(userId);
        res.json({ message: 'All notifications removed' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteAllNotifications = deleteAllNotifications;
