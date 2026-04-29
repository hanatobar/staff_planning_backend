const repo = require("../repositories/messageRepository");
const notificationService = require("./notificationService");

class MessageService {
  async sendMessage(
    senderUserId,
    receiverUserId,
    content,
    assignmentId = 0,
    appealId = 0,
    conflictId = 0,
    roundId = 0
  ) {
    if (!content || !content.trim()) {
      throw new Error("Message content is required");
    }

    if (Number(senderUserId) === Number(receiverUserId)) {
      throw new Error("You cannot message yourself");
    }

    const sender = await repo.userExists(senderUserId);
    const receiver = await repo.userExists(receiverUserId);

    if (!sender || !receiver) {
      throw new Error("Sender or receiver not found");
    }

    const allowedRoles = ["TA", "COORDINATOR"];

    if (!allowedRoles.includes(String(sender.role).toUpperCase()) ||
        !allowedRoles.includes(String(receiver.role).toUpperCase())) {
      throw new Error("Messaging is allowed only between TAs and coordinators");
    }

    await repo.sendMessage({
      senderUserId,
      receiverUserId,
      content: content.trim(),
      assignmentId: assignmentId || null,
      appealId: appealId || null,
      conflictId: conflictId || null,
      roundId: roundId || null,
    });

    await notificationService.createSystemNotification(
      Number(receiverUserId),
      "New Message",
      "You received a new message.",
      "MESSAGE_RECEIVED",
      roundId || null,
      assignmentId || null
    );

    return { message: "Message sent successfully" };
  }

  async getConversation(userId, otherUserId) {
    const user = await repo.userExists(userId);
    const other = await repo.userExists(otherUserId);

    if (!user || !other) {
      throw new Error("User not found");
    }

    return await repo.getConversation(userId, otherUserId);
  }

  async getInbox(userId) {
    const user = await repo.userExists(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return await repo.getInbox(userId);
  }

  async markConversationAsRead(userId, otherUserId) {
    await repo.markConversationAsRead(userId, otherUserId);
    return { message: "Conversation marked as read" };
  }

  async getUnreadMessageCount(userId) {
    return await repo.getUnreadMessageCount(userId);
  }
}

module.exports = new MessageService();