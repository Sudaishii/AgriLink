import { Router, Request, Response, NextFunction } from 'express';
import * as messageController from '../controllers/messageController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

const maybeMessageImage = (req: Request, res: Response, next: NextFunction) => {
  const ct = String(req.headers['content-type'] || '');
  if (ct.includes('multipart/form-data')) {
    return upload.single('image')(req, res, next);
  }
  next();
};

router.get('/', authenticateToken, messageController.getConversations);
router.put('/read-all', authenticateToken, messageController.markAllMessagesRead);
router.get('/:otherUserId', authenticateToken, messageController.getMessages);
router.post('/', authenticateToken, maybeMessageImage, messageController.sendMessage);
router.put('/:otherUserId/read', authenticateToken, messageController.markAsRead);

export default router;
