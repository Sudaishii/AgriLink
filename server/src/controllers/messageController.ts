import { Request, Response } from 'express';
import { messageService } from '../services/messageService';
import { notificationService } from '../services/notificationService';
import { db } from '../database/database';
import { emitToUser } from '../socket';
import { writeLog } from '../services/systemLogService';

export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const conversations = await messageService.getConversations(userId);
    res.json({ conversations });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { otherUserId } = req.params;
    const other = Number(otherUserId);
    if (!Number.isFinite(other) || other <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const messages = await messageService.getMessages(userId, other);
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const senderId = (req as any).user.id;
    const file = (req as any).file as Express.Multer.File | undefined;
    const { receiverId, content } = req.body;

    if (receiverId === undefined || receiverId === null || receiverId === '') {
      return res.status(400).json({ message: 'receiverId is required' });
    }
    const receiverNum = Number(receiverId);
    if (!Number.isFinite(receiverNum) || receiverNum <= 0 || receiverNum === senderId) {
      return res.status(400).json({ message: 'Invalid receiver' });
    }

    const text = typeof content === 'string' ? content.trim() : '';
    if (!text && !file) {
      return res.status(400).json({ message: 'Message text or image is required' });
    }

    let imagePublicPath: string | null = null;
    if (file?.filename) {
      imagePublicPath = `/uploads/${file.filename}`;
    }

    const insertResult: any = await messageService.sendMessage(
      senderId,
      receiverNum,
      text || '',
      imagePublicPath
    );

    const [senderRows]: any = await db.execute(
      'SELECT first_name, last_name FROM users_table WHERE id = ?',
      [senderId]
    );
    const senderName = senderRows[0]
      ? `${senderRows[0].first_name} ${senderRows[0].last_name}`
      : 'A user';

    let notifMessage = `${senderName} sent you a message`;
    if (imagePublicPath && text) {
      notifMessage = `${senderName} sent a photo: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`;
    } else if (imagePublicPath) {
      notifMessage = `${senderName} sent a photo`;
    } else {
      notifMessage = `${senderName}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`;
    }

    await notificationService.createNotification(
      receiverNum,
      'New Message',
      notifMessage,
      'message',
      `/messages?contactId=${senderId}`
    );

    // Realtime payload: fetch the exact inserted row when insertId exists.
    let sentMessage: any = null;
    const insertedId = Number(insertResult?.insertId);
    if (Number.isFinite(insertedId) && insertedId > 0) {
      const [byIdRows]: any = await db.execute(
        'SELECT * FROM messages_table WHERE m_id = ? LIMIT 1',
        [insertedId]
      );
      sentMessage = byIdRows?.[0] ?? null;
    }
    if (!sentMessage) {
      const [latestRows]: any = await db.execute(
        'SELECT * FROM messages_table WHERE sender_id = ? AND receiver_id = ? ORDER BY created_at DESC LIMIT 1',
        [senderId, receiverNum]
      );
      sentMessage = latestRows?.[0] ?? null;
    }

    if (sentMessage) {
      // Push to both ends so sender and receiver update thread instantly.
      emitToUser(receiverNum, 'new_message', sentMessage);
      emitToUser(senderId, 'new_message', sentMessage);
    }

    res.status(201).json({ message: 'Message sent successfully', data: sentMessage });

    // System log: Messaging action
    writeLog({
      correlation_id: (req as any).correlationId,
      user_id:        senderId,
      user_name:      senderName,
      user_role:      (req as any).user?.role || 'user',
      action:         'Chat Message Sent',
      event_type:     'create',
      module:         'Messaging',
      detail:         `Message sent from ${senderId} to ${receiverNum}`,
      category:       'Messaging',
      severity:       'info',
      ip_address:     req.ip,
      user_agent:     req.headers['user-agent'],
      http_status:    201
    }).catch(() => {});
  } catch (error: any) {
    if (error?.code === 'ER_BAD_FIELD_ERROR' && String(error?.message || '').includes('image_path')) {
      return res.status(500).json({
        message:
          'Message images require DB migration. Run server/src/database/add_message_image_path.sql on your database.',
      });
    }
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { otherUserId } = req.params;
    const other = Number(otherUserId);
    if (!Number.isFinite(other) || other <= 0) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    await messageService.markAsRead(other, userId);
    const link = `/messages?contactId=${other}`;
    await notificationService.markNotificationsAsReadByLink(userId, link);
    // Push realtime read-state update so notification badge/list updates instantly on view.
    emitToUser(userId, 'notifications_read_by_link', { link });
    // Push realtime message read-state update so message unread indicators sync across sessions.
    emitToUser(userId, 'messages_read', { otherUserId: other });
    res.json({ message: 'Messages marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllMessagesRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await messageService.markAllAsReadForReceiver(userId);
    emitToUser(userId, 'messages_read_all', { ok: true });
    res.json({ message: 'All messages marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
