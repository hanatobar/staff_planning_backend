const db = require("../db/database");

class MessageRepository {
  async sendMessage({
    senderUserId,
    receiverUserId,
    content,
    assignmentId = null,
    appealId = null,
    conflictId = null,
    roundId = null,
  }) {
    const result = await db.query(`
      INSERT INTO message
        (sender_user_id, receiver_user_id, content, assignment_id, appeal_id, conflict_id, round_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      senderUserId,
      receiverUserId,
      content,
      assignmentId || null,
      appealId || null,
      conflictId || null,
      roundId || null,
    ]);

    return result.rows[0];
  }

  async getConversation(userId, otherUserId) {
    const result = await db.query(`
      SELECT *
      FROM message
      WHERE
        (sender_user_id = $1 AND receiver_user_id = $2)
        OR
        (sender_user_id = $2 AND receiver_user_id = $1)
      ORDER BY created_at ASC, id ASC
    `, [userId, otherUserId]);

    return result.rows;
  }

  async markConversationAsRead(userId, otherUserId) {
    await db.query(`
      UPDATE message
      SET is_read = TRUE
      WHERE receiver_user_id = $1
        AND sender_user_id = $2
        AND is_read = FALSE
    `, [userId, otherUserId]);
  }

  async getUnreadMessageCount(userId) {
    const result = await db.query(`
      SELECT COUNT(*)::int AS count
      FROM message
      WHERE receiver_user_id = $1
        AND is_read = FALSE
    `, [userId]);

    return result.rows[0].count;
  }

  async getInbox(userId) {
    const result = await db.query(`
      WITH ranked AS (
        SELECT
          m.*,
          CASE
            WHEN m.sender_user_id = $1 THEN m.receiver_user_id
            ELSE m.sender_user_id
          END AS other_user_id,
          ROW_NUMBER() OVER (
            PARTITION BY
              CASE
                WHEN m.sender_user_id = $1 THEN m.receiver_user_id
                ELSE m.sender_user_id
              END
            ORDER BY m.created_at DESC, m.id DESC
          ) AS rn
        FROM message m
        WHERE m.sender_user_id = $1 OR m.receiver_user_id = $1
      ),
      unread AS (
        SELECT
          sender_user_id AS other_user_id,
          COUNT(*)::int AS unread_count
        FROM message
        WHERE receiver_user_id = $1
          AND is_read = FALSE
        GROUP BY sender_user_id
      )
      SELECT
        r.other_user_id,
        u.name AS other_user_name,
        u.role AS other_user_role,
        r.content AS last_message,
        r.created_at AS last_message_at,
        COALESCE(unread.unread_count, 0) AS unread_count
      FROM ranked r
      JOIN users u ON u.id = r.other_user_id
      LEFT JOIN unread ON unread.other_user_id = r.other_user_id
      WHERE r.rn = 1
      ORDER BY r.created_at DESC, r.id DESC
    `, [userId]);

    return result.rows;
  }

  async userExists(userId) {
    const result = await db.query(`
      SELECT id, role
      FROM users
      WHERE id = $1
    `, [userId]);

    return result.rows[0] || null;
  }
}

module.exports = new MessageRepository();