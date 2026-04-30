const service = require("../services/notificationService");

class NotificationHttpController {

  async getNotificationsByUser(req, res) {
    try {
      const userId = Number(req.params.userId);

      const data = await service.getNotificationsByUser(userId);

      const formatted = data.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        isRead: n.is_read,
        createdAt: n.created_at
      }));

      res.json({ notifications: formatted });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const userId = Number(req.params.userId);

      const count = await service.getUnreadCount(userId);

      res.json({ count });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async markNotificationAsRead(req, res) {
    try {
      const id = Number(req.params.id);

      const result = await service.markNotificationAsRead(id);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async markAllNotificationsAsRead(req, res) {
    try {
      const userId = Number(req.params.userId);

      const result = await service.markAllNotificationsAsRead(userId);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async sendToAllTAs(req, res) {
    try {
      const { title, body } = req.body;

      const result = await service.sendNotificationToAllTAs(title, body);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async sendToOneUser(req, res) {
    try {
      const { userId, title, body } = req.body;

      const result = await service.sendNotificationToOneUser(userId, title, body);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async sendToSelectedUsers(req, res) {
    try {
      const { userIds, title, body } = req.body;

      const result = await service.sendNotificationToSelectedUsers(userIds, title, body);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

}

module.exports = new NotificationHttpController();