import express from 'express';
import {
  getNotifications,
  markNotificationsAsRead,
  clearAllNotifications
} from '../Controllers/notifications.controller.js';

const router = express.Router();

router.get('/:userId', getNotifications);
router.patch('/mark-as-read', markNotificationsAsRead);
router.delete('/clear/:userId', clearAllNotifications);

export default router;