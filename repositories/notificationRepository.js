const db = require("../db/database");

class NotificationRepository {
  async createNotification(recipientUserId, title, body, type, roundId = null, assignmentId = null) {
    const result = await db.query(`
      INSERT INTO notification
      (recipient_user_id, title, body, type, round_id, assignment_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [recipientUserId, title, body, type, roundId, assignmentId]);

    return result.rows[0];
  }

async getNotificationsByUser(userId) {
  console.log("REPO getNotificationsByUser userId =", userId);

  const result = await db.query(`
    SELECT *
    FROM notification
    WHERE recipient_user_id = $1
    ORDER BY created_at DESC, id DESC
  `, [userId]);

  console.log("REPO notifications rows =", result.rows.length);

  return result.rows;
}

  async getUnreadCount(userId) {
    const result = await db.query(`
      SELECT COUNT(*)::int AS count
      FROM notification
      WHERE recipient_user_id = $1
        AND is_read = FALSE
    `, [userId]);

    return result.rows[0].count;
  }

  async markNotificationAsRead(notificationId) {
    const result = await db.query(`
      UPDATE notification
      SET is_read = TRUE
      WHERE id = $1
      RETURNING *
    `, [notificationId]);

    return result.rows[0] || null;
  }

  async markAllNotificationsAsRead(userId) {
    await db.query(`
      UPDATE notification
      SET is_read = TRUE
      WHERE recipient_user_id = $1
        AND is_read = FALSE
    `, [userId]);
  }

  async getAllTAs() {
    const result = await db.query(`
      SELECT id, user_id, name, email
      FROM staff
      WHERE LOWER(role) = 'ta'
      ORDER BY name
    `);

    return result.rows;
  }

  async getPendingSchedules(now = new Date()) {
    const result = await db.query(`
      SELECT *
      FROM notification_schedule
      WHERE is_sent = FALSE
        AND scheduled_at <= $1
      ORDER BY scheduled_at ASC
    `, [now]);

    return result.rows;
  }

  async createSchedule(roundId, notificationType, scheduledAt) {
    const result = await db.query(`
      INSERT INTO notification_schedule (round_id, notification_type, scheduled_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [roundId, notificationType, scheduledAt]);

    return result.rows[0];
  }

  async markScheduleAsSent(id) {
    await db.query(`
      UPDATE notification_schedule
      SET is_sent = TRUE
      WHERE id = $1
    `, [id]);
  }

  async notificationExists(recipientUserId, type, roundId = null, assignmentId = null) {
    const result = await db.query(`
      SELECT 1
      FROM notification
      WHERE recipient_user_id = $1
        AND type = $2
        AND (
          ($3::int IS NULL AND round_id IS NULL) OR round_id = $3
        )
        AND (
          ($4::int IS NULL AND assignment_id IS NULL) OR assignment_id = $4
        )
      LIMIT 1
    `, [recipientUserId, type, roundId, assignmentId]);

    return result.rows.length > 0;
  }

  async getRoundById(roundId) {
    const result = await db.query(`
      SELECT *
      FROM preference_round
      WHERE id = $1
    `, [roundId]);

    return result.rows[0] || null;
  }

  async getNotSubmittedTAsInRound(roundId) {
    const result = await db.query(`
      SELECT s.id, s.user_id, s.name, s.email
      FROM preference_submission_status pss
      JOIN staff s ON s.id = pss.staff_id
      WHERE pss.round_id = $1
        AND pss.status = 'NOT_SUBMITTED'
      ORDER BY s.name
    `, [roundId]);

    return result.rows;
  }
}

module.exports = new NotificationRepository();