import User from '../Models/Users.js';
import Chat from '../Models/Chat.js';

export const getNotifications = async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId)
        .select('notifications')
        .populate('notifications.sender', 'name avatar');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Sort notifications by createdAt (newest first)
      const sortedNotifications = user.notifications.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      res.status(200).json({
        success: true,
        notifications: sortedNotifications
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  };
  
  // Mark notifications as read
  export const markNotificationsAsRead = async (req, res) => {
    try {
      const { userId, notificationIds } = req.body;
      
      await User.updateOne(
        { _id: userId },
        { $set: { 'notifications.$[elem].read': true } },
        { 
          arrayFilters: [{ 'elem._id': { $in: notificationIds } }],
          multi: true
        }
      );
      
      res.status(200).json({
        success: true,
        message: 'Notifications marked as read'
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  };
  
  // Clear all notifications
  export const clearAllNotifications = async (req, res) => {
    try {
      const { userId } = req.params;
      
      await User.findByIdAndUpdate(userId, {
        $set: { notifications: [] }
      });
      
      res.status(200).json({
        success: true,
        message: 'All notifications cleared'
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  };