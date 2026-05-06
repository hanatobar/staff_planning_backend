const repo = require("../repositories/notificationRepository");
const emailService = require("./emailService");
const db = require("../db/database");

class NotificationService {
async getNotificationsByUser(userId) {
  console.log("SERVICE getNotificationsByUser userId =", userId);
  return await repo.getNotificationsByUser(userId);
}

  async getUnreadCount(userId) {
    return await repo.getUnreadCount(userId);
  }

  async markNotificationAsRead(notificationId) {
    const notification = await repo.markNotificationAsRead(notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    return { message: "Notification marked as read" };
  }

  async markAllNotificationsAsRead(userId) {
    await repo.markAllNotificationsAsRead(userId);
    return { message: "All notifications marked as read" };
  }

  async sendNotificationToAllTAs(title, body) {
    const tas = await repo.getAllTAs();

    for (const ta of tas) {
      if (!ta.user_id) continue;

      await repo.createNotification(
        ta.user_id,
        title,
        body,
        "COORDINATOR_NOTICE"
      );
    }

    return { message: "Notification sent to all TAs" };
  }

  async sendNotificationToOneUser(userId, title, body) {
    await repo.createNotification(
      userId,
      title,
      body,
      "COORDINATOR_NOTICE"
    );

    return { message: "Notification sent successfully" };
  }

  async sendNotificationToSelectedUsers(userIds, title, body) {
    for (const userId of userIds) {
      await repo.createNotification(
        userId,
        title,
        body,
        "COORDINATOR_NOTICE"
      );
    }

    return { message: "Notification sent to selected users" };
  }

async createSystemNotification(
  recipientUserId,
  title,
  body,
  type,
  roundId = null,
  assignmentId = null
) {
  try {
    console.log("🔔 Creating notification for:", recipientUserId);

    const result = await repo.createNotification(
      recipientUserId,
      title,
      body,
      type,
      roundId,
      assignmentId
    );

    console.log("✅ Notification created");

    return result;

  } catch (err) {
    console.error("❌ Notification failed:", err.message);
    throw err;
  }
}



schedule15MinReminderIfNeeded(round) {
  const now = new Date();
  const end = new Date(round.end_at);

  const reminderTime = new Date(end.getTime() - 15 * 60 * 1000);
  const delay = reminderTime.getTime() - now.getTime();

  console.log("⏳ Reminder delay:", delay);

  if (delay <= 0) {
    console.log("⚠️ Reminder time already passed");
    return;
  }

  setTimeout(async () => {
    try {
      console.log("🚀 Sending 15-min reminder...");

      const tas = await db.query(`
        SELECT id, user_id, name, email
        FROM staff
        WHERE LOWER(role) = 'ta'
      `);

await Promise.all(
  tas.rows.map(async (ta) => {
    console.log("🔔 Sending to user:", ta.user_id);

    await Promise.all([
      // ✅ EMAIL
      emailService.sendEmail(
        ta.email,
        "Reminder: Preference Round Ending Soon",
        `Hello ${ta.name},

The preference round will end in 15 minutes.
Please submit your preferences.`
      ),

      // ✅ NOTIFICATION (FIXED)
      await this.createSystemNotification(   // 🔥 IMPORTANT: await here
        ta.user_id,
        "Reminder: Round Ending Soon",
        "15 minutes remaining to submit preferences",
        "ROUND_REMINDER",
        round.id,
        null
      )
    ]);
  })
);

      console.log("✅ Reminder sent successfully");

    } catch (err) {
      console.error("❌ Reminder failed:", err.message);
    }
  }, delay);
}

  async processPendingSchedules() {
    const schedules = await repo.getPendingSchedules();

    for (const schedule of schedules) {
      if (schedule.notification_type === "ROUND_REMINDER_15_MIN") {
        const round = await repo.getRoundById(schedule.round_id);

        if (round && !round.is_locked) {
          const tas = await repo.getNotSubmittedTAsInRound(round.id);

          for (const ta of tas) {
            if (ta.user_id) {
              await repo.createNotification(
                ta.user_id,
                "Preference Deadline Reminder",
                "You still have not submitted your preferences. The deadline is in 15 minutes.",
                "ROUND_REMINDER_15_MIN",
                round.id,
                null
              );
            }

            await emailService.sendEmail(
              ta.email,
              "Preference Deadline Reminder",
              `Hello ${ta.name},

You still have not submitted your preferences.

The deadline is in 15 minutes.

Please submit your preferences before the round closes.

Regards,
Staff Planning System`
            );
          }
        }
      }

      await repo.markScheduleAsSent(schedule.id);
    }
  }
}

module.exports = new NotificationService();