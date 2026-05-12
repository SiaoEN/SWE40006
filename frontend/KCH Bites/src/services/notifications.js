import api from "./api";

export async function getUnreadNotifications() {
  try {
    const response = await api.get("/notifications/unread");
    return response.data;
  } catch (error) {
    const status = error?.response?.status;

    // Fallback for servers that expose only the paginated endpoint.
    if (status === 404) {
      const fallbackResponse = await api.get("/notifications", {
        params: { page: 1, limit: 100 },
      });

      const allNotifications = Array.isArray(fallbackResponse.data?.notifications)
        ? fallbackResponse.data.notifications
        : [];
      const unreadNotifications = allNotifications.filter((notification) => !notification.isRead);

      return {
        success: true,
        notifications: unreadNotifications,
        count: unreadNotifications.length,
      };
    }

    console.error("Error fetching unread notifications:", error);
    throw error;
  }
}

export async function getAllNotifications(page = 1, limit = 20) {
  try {
    const response = await api.get("/notifications", {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const response = await api.put("/notifications/read-all/mark");
    return response.data;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

export async function deleteNotification(notificationId) {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}
