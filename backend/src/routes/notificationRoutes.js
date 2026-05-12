const express = require("express");
const authenticateToken = require("../middleware/auth");
const {
  getUnreadNotifications,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const router = express.Router();

/**
 * GET /api/notifications/unread
 * Get unread notifications for the logged-in user
 */
router.get("/unread", authenticateToken, async (req, res) => {
  console.log('notificationRoutes: received GET /unread', req.originalUrl);
  try {
    const userId = req.user.userId || req.user.id;
    const username = req.user.username;
    const result = await getUnreadNotifications(userId, username);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/notifications
 * Get all notifications for the logged-in user (paginated)
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const username = req.user.username;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await getAllNotifications(userId, username, page, limit);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/notifications/:notificationId/read
 * Mark a single notification as read
 */
router.put("/:notificationId/read", authenticateToken, async (req, res) => {
  try {
    const result = await markNotificationAsRead(req.params.notificationId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the logged-in user
 */
router.put("/read-all/mark", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const username = req.user.username;
    const result = await markAllNotificationsAsRead(userId, username);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete a notification
 */
router.delete("/:notificationId", authenticateToken, async (req, res) => {
  try {
    const result = await deleteNotification(req.params.notificationId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
