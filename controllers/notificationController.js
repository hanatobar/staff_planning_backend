const service = require("../services/notificationService");

class NotificationController {
async getNotificationsByUser(call, callback) {
  try {
    console.log("GET NOTIFICATIONS USER ID:", call.request.userId);

    const data = await service.getNotificationsByUser(call.request.userId);

    console.log("NOTIFICATIONS FOUND:", data.length);

    const formatted = data.map(n => ({
      id: Number(n.id),
      recipientUserId: Number(n.recipient_user_id),
      title: n.title,
      body: n.body,
      type: n.type,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at ? new Date(n.created_at).toISOString() : "",
      roundId: n.round_id ? Number(n.round_id) : 0,
      assignmentId: n.assignment_id ? Number(n.assignment_id) : 0,
    }));

    callback(null, { notifications: formatted });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);
    callback({ code: 500, message: error.message });
  }
}

  async getUnreadCount(call, callback) {
    try {
      const count = await service.getUnreadCount(call.request.userId);
      callback(null, { count });
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async markNotificationAsRead(call, callback) {
    try {
      const result = await service.markNotificationAsRead(call.request.notificationId);
      callback(null, result);
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async markAllNotificationsAsRead(call, callback) {
    try {
      const result = await service.markAllNotificationsAsRead(call.request.userId);
      callback(null, result);
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async sendNotificationToAllTAs(call, callback) {
    try {
      const result = await service.sendNotificationToAllTAs(
        call.request.title,
        call.request.body
      );
      callback(null, result);
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async sendNotificationToOneUser(call, callback) {
    try {
      const result = await service.sendNotificationToOneUser(
        call.request.userId,
        call.request.title,
        call.request.body
      );
      callback(null, result);
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async sendNotificationToSelectedUsers(call, callback) {
    try {
      const result = await service.sendNotificationToSelectedUsers(
        call.request.userIds,
        call.request.title,
        call.request.body
      );
      callback(null, result);
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }
}

module.exports = new NotificationController();