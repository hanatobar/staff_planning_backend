const service = require("../services/messageService");

class MessageHttpController {

  async sendMessage(req, res) {
    try {
      const {
        senderUserId,
        receiverUserId,
        content,
        assignmentId = 0,
        appealId = 0,
        conflictId = 0,
        roundId = 0
      } = req.body;

      const result = await service.sendMessage(
        senderUserId,
        receiverUserId,
        content,
        assignmentId,
        appealId,
        conflictId,
        roundId
      );

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getConversation(req, res) {
    try {
      const { userId, otherUserId } = req.query;

      const data = await service.getConversation(
        Number(userId),
        Number(otherUserId)
      );

      const formatted = data.map(m => ({
        id: m.id,
        senderUserId: m.sender_user_id,
        receiverUserId: m.receiver_user_id,
        content: m.content,
        createdAt: m.created_at,
        isRead: m.is_read
      }));

      res.json({ messages: formatted });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getInbox(req, res) {
    try {
      const userId = Number(req.params.userId);

      const data = await service.getInbox(userId);

      const formatted = data.map(c => ({
        otherUserId: c.other_user_id,
        otherUserName: c.other_user_name,
        lastMessage: c.last_message,
        lastMessageTime: c.last_message_time,
        unreadCount: c.unread_count
      }));

      res.json({ conversations: formatted });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async markConversationAsRead(req, res) {
    try {
      const { userId, otherUserId } = req.body;

      const result = await service.markConversationAsRead(
        userId,
        otherUserId
      );

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const userId = Number(req.params.userId);

      const count = await service.getUnreadMessageCount(userId);

      res.json({ count });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

}

module.exports = new MessageHttpController();