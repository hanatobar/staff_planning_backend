const service = require("../services/messageService");

class MessageController {
  async sendMessage(call, callback) {
    try {
      const {
        senderUserId,
        receiverUserId,
        content,
        assignmentId,
        appealId,
        conflictId,
        roundId,
      } = call.request;

      const result = await service.sendMessage(
        senderUserId,
        receiverUserId,
        content,
        assignmentId,
        appealId,
        conflictId,
        roundId
      );

      callback(null, result);
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async getConversation(call, callback) {
    try {
      const data = await service.getConversation(
        call.request.userId,
        call.request.otherUserId
      );

      const formatted = data.map(m => ({
        id: Number(m.id),
        senderUserId: Number(m.sender_user_id),
        receiverUserId: Number(m.receiver_user_id),
        content: m.content || "",
        isRead: Boolean(m.is_read),
        createdAt: m.created_at ? new Date(m.created_at).toISOString() : "",
        assignmentId: Number(m.assignment_id || 0),
        appealId: Number(m.appeal_id || 0),
        conflictId: Number(m.conflict_id || 0),
        roundId: Number(m.round_id || 0),
      }));

      callback(null, { messages: formatted });
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async getInbox(call, callback) {
    try {
      const data = await service.getInbox(call.request.userId);

      const formatted = data.map(c => ({
        otherUserId: Number(c.other_user_id),
        otherUserName: c.other_user_name || "",
        otherUserRole: c.other_user_role || "",
        lastMessage: c.last_message || "",
        lastMessageAt: c.last_message_at
          ? new Date(c.last_message_at).toISOString()
          : "",
        unreadCount: Number(c.unread_count || 0),
      }));

      callback(null, { conversations: formatted });
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async markConversationAsRead(call, callback) {
    try {
      const result = await service.markConversationAsRead(
        call.request.userId,
        call.request.otherUserId
      );
      callback(null, result);
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async getUnreadMessageCount(call, callback) {
    try {
      const count = await service.getUnreadMessageCount(call.request.userId);
      callback(null, { count });
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }
}

module.exports = new MessageController();