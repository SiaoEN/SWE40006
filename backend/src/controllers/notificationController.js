const { getDb } = require("../../config/db");
const { ObjectId } = require("mongodb");

function buildRecipientFilter(userId, username) {
  const filters = [];

  if (userId) {
    filters.push({ userId });
    filters.push({ recipientUserId: userId });
  }

  if (username) {
    filters.push({ username });
    filters.push({ recipientUsername: username });
  }

  if (filters.length === 0) {
    return { userId: null };
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return { $or: filters };
}

function getActorUserIdFromMessage(message) {
  if (!message || typeof message !== "string") {
    return null;
  }

  const [firstToken] = message.split(" ");
  return firstToken || null;
}

async function enrichReviewNotification(notification, usersCollection) {
  if (!notification || (notification.type !== "review_like" && notification.type !== "review_dislike")) {
    return notification;
  }

  let actorUsername = notification.actorUsername || null;

  if (!actorUsername) {
    const actorUserId = notification.actorUserId || getActorUserIdFromMessage(notification.message);
    if (actorUserId && ObjectId.isValid(actorUserId)) {
      const actorUser = await usersCollection.findOne({ _id: new ObjectId(actorUserId) });
      actorUsername = actorUser?.name || actorUserId;
    }
  }

  if (!actorUsername) {
    actorUsername = notification.message || "Someone";
  }

  const message = notification.message || "";
  const updatedMessage = message && getActorUserIdFromMessage(message)
    ? message.replace(/^\S+/, actorUsername)
    : message;

  const persistedNotification = {
    ...notification,
    actorUsername,
    message: updatedMessage,
  };

  if (notification?._id && updatedMessage !== message) {
    try {
      const db = getDb();
      const notificationsCollection = db.collection("Notifications");
      await notificationsCollection.updateOne(
        { _id: notification._id },
        {
          $set: {
            message: updatedMessage,
            actorUsername,
          },
        }
      );
    } catch (err) {
      console.error("Error backfilling review notification:", err);
    }
  }

  return persistedNotification;
}

async function enrichNotifications(notifications) {
  if (!notifications.length) {
    return notifications;
  }

  const db = getDb();
  const usersCollection = db.collection("User");
  const enriched = [];

  for (const notification of notifications) {
    enriched.push(await enrichReviewNotification(notification, usersCollection));
  }

  return enriched;
}

/**
 * Create a notification for a user
 */
async function createNotification(recipient, type, title, message, relatedId = null, actor = null) {
  try {
    const db = getDb();
    const notificationsCollection = db.collection("Notifications");

    const recipientUserId = typeof recipient === "object" ? recipient?.userId || null : recipient || null;
    const recipientUsername = typeof recipient === "object" ? recipient?.username || null : null;
    const actorUserId = typeof actor === "object" ? actor?.userId || null : null;
    const actorUsername = typeof actor === "object" ? actor?.username || null : null;

    const notification = {
      userId: recipientUserId || recipientUsername,
      recipientUserId,
      recipientUsername,
      type, // 'news', 'review_like', 'feedback_reply'
      title,
      message,
      relatedId,
      actorUserId,
      actorUsername,
      isRead: false,
      createdAt: new Date(),
    };

    const result = await notificationsCollection.insertOne(notification);
    return { success: true, notification: { ...notification, _id: result.insertedId } };
  } catch (err) {
    console.error("Error creating notification:", err);
    return { success: false, message: err.message };
  }
}

/**
 * Get all unread notifications for a user
 */
async function getUnreadNotifications(userId, username) {
  try {
    const db = getDb();
    const notificationsCollection = db.collection("Notifications");
    const recipientFilter = buildRecipientFilter(userId, username);

    const notifications = await notificationsCollection
      .find({ ...recipientFilter, isRead: false })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedNotifications = await enrichNotifications(notifications);

    return { success: true, notifications: enrichedNotifications, count: enrichedNotifications.length };
  } catch (err) {
    console.error("Error fetching unread notifications:", err);
    return { success: false, message: err.message };
  }
}

/**
 * Get all notifications for a user (paginated)
 */
async function getAllNotifications(userId, username, page = 1, limit = 20) {
  try {
    const db = getDb();
    const notificationsCollection = db.collection("Notifications");
    const recipientFilter = buildRecipientFilter(userId, username);

    const skip = (page - 1) * limit;
    const notifications = await notificationsCollection
      .find(recipientFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const enrichedNotifications = await enrichNotifications(notifications);

    const total = await notificationsCollection.countDocuments(recipientFilter);

    return { success: true, notifications: enrichedNotifications, total, page, limit };
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return { success: false, message: err.message };
  }
}

/**
 * Mark a notification as read
 */
async function markNotificationAsRead(notificationId) {
  try {
    const db = getDb();
    const notificationsCollection = db.collection("Notifications");

    const result = await notificationsCollection.updateOne(
      { _id: new ObjectId(notificationId) },
      { $set: { isRead: true } }
    );

    return { success: result.modifiedCount > 0 };
  } catch (err) {
    console.error("Error marking notification as read:", err);
    return { success: false, message: err.message };
  }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsAsRead(userId, username) {
  try {
    const db = getDb();
    const notificationsCollection = db.collection("Notifications");
    const recipientFilter = buildRecipientFilter(userId, username);

    const result = await notificationsCollection.updateMany(
      { ...recipientFilter, isRead: false },
      { $set: { isRead: true } }
    );

    return { success: true, modifiedCount: result.modifiedCount };
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    return { success: false, message: err.message };
  }
}

/**
 * Delete a notification
 */
async function deleteNotification(notificationId) {
  try {
    const db = getDb();
    const notificationsCollection = db.collection("Notifications");

    const result = await notificationsCollection.deleteOne({ _id: new ObjectId(notificationId) });

    return { success: result.deletedCount > 0 };
  } catch (err) {
    console.error("Error deleting notification:", err);
    return { success: false, message: err.message };
  }
}

module.exports = {
  createNotification,
  getUnreadNotifications,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
