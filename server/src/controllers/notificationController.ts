import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService';
import { messageService } from '../services/messageService';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const notifications = await notificationService.getNotificationsByUserId(userId);

    let unreadMessageTotal = 0;
    let recentConversations: unknown[] = [];
    try {
      const conversations = (await messageService.getConversations(userId)) as Array<{ unreadCount?: number }>;
      const convs = Array.isArray(conversations) ? conversations : [];
      unreadMessageTotal = convs.reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0);
      recentConversations = convs.slice(0, 5);
    } catch (msgErr) {
      console.error('[getNotifications] message snapshot failed', msgErr);
    }

    res.json({ notifications, unreadMessageTotal, recentConversations });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await notificationService.markAllAsRead(userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    await notificationService.markAsRead(Number(id), userId);
    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    await notificationService.deleteNotification(Number(id), userId);
    res.json({ message: 'Notification deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await notificationService.deleteAllForUser(userId);
    res.json({ message: 'All notifications removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
