const repo = require("../repositories/preferenceRoundRepository");
const emailService = require("./emailService");
const db = require("../db/database");
const notificationService = require("./notificationService");

class PreferenceRoundService {

async safeSendEmail(to, subject, text) {
  try {
    console.log("📧 Sending email to:", to);

    await emailService.sendEmail(to, subject, text);

    console.log("✅ Email sent:", to);
  } catch (err) {
    console.error("❌ Email failed:", to, err.message);
  }
}



async handleOpenRoundBackground(round, semester, startAt, endAt) {
  try {
    const tas = await db.query(`
      SELECT id, user_id, name, email
      FROM staff
      WHERE LOWER(TRIM(role)) IN ('ta', 'teaching assistant')
    `);

    const formattedStart = new Date(startAt).toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12 : true
    });

    const formattedEnd = new Date(endAt).toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12 : true
    });

    console.log("🚀 Background tasks started");

    // ✅ EMAILS (parallel)
    await Promise.all(
      tas.rows.map(ta =>
        this.safeSendEmail(
          ta.email,
          "Preference Round Opened",
          `Hello ${ta.name},

Semester: ${semester}
Start: ${formattedStart}
Deadline: ${formattedEnd}

Please submit your preferences.`
        )
      )
    );

    // ✅ NOTIFICATIONS (parallel)
    await Promise.all(
      tas.rows.map(ta =>
        notificationService.createSystemNotification(
          ta.user_id,
          "Preference Round Created",
          `Semester: ${semester}
Start: ${formattedStart}
Deadline: ${formattedEnd}`,
          "ROUND_OPENED",
          round.id,
          null
        )
      )
    );

    // ✅ REMINDER
    await notificationService.schedule15MinReminderIfNeeded(round);

    console.log("✅ Background tasks finished");

  } catch (err) {
    console.error("❌ Background failed:", err.message);
  }
}


async openRound(startAt, endAt, userId, conflictResolutionMode, semester) {
  if (new Date(startAt) >= new Date(endAt)) {
    throw new Error("Start time must be before end time");
  }

  if (!["FAIRNESS", "PRIORITY"].includes(conflictResolutionMode)) {
    throw new Error("Invalid conflict resolution mode");
  }

  const normalizedSemester = (semester || "").trim().toLowerCase();

  if (!normalizedSemester) {
    throw new Error("Semester is required");
  }

  const semesterExists = await db.query(`
    SELECT 1 FROM course
    WHERE LOWER(TRIM(semester)) = $1
    LIMIT 1
  `, [normalizedSemester]);

  if (semesterExists.rows.length === 0) {
    throw new Error("Selected semester does not exist in courses");
  }

  await this.autoLockIfNeeded();

  const activeRound = await repo.getActiveUnlockedRound();
  if (activeRound) {
    throw new Error("Another active round exists");
  }

  const round = await repo.createRound(
    startAt,
    endAt,
    userId,
    conflictResolutionMode,
    normalizedSemester
  );

  // ✅ MUST stay awaited
  await repo.initializeSubmissionStatus(round.id);

  // ✅ DO NOT await this
  this.handleOpenRoundBackground(round, normalizedSemester, startAt, endAt);
  this.scheduleRoundAutoLockIfNeeded(round);

  return { message: "Preference round opened successfully" };
}

  async getCurrentRound() {
    return await this.getReadableRound();
  }


  async getCoordinatorUser() {
  const result = await db.query(`
    SELECT id, email
    FROM users
    WHERE UPPER(role) = 'COORDINATOR'
    ORDER BY id
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    throw new Error("No coordinator account found");
  }

  return result.rows[0];
}
  async autoLockIfNeeded() {
    const round = await repo.getLatestRound();

    if (!round) return null;

    const now = new Date();
    const end = new Date(round.end_at);

    if (!round.is_locked && now >= end) {
      await this.lockRound(null, true);
      return await repo.getLatestRound();
    }

    return round;
  }

  scheduleRoundAutoLockIfNeeded(round) {
    if (!round || round.is_locked) return;

    const delay = new Date(round.end_at).getTime() - Date.now();
    if (delay <= 0) return;

    setTimeout(() => {
      this.autoLockIfNeeded().catch((err) => {
        console.error("AUTO LOCK TIMER ERROR:", err.message);
      });
    }, delay);
  }

  async processDueRoundLocks() {
    const round = await repo.getLatestRound();

    if (!round || round.is_locked) return;

    if (new Date() >= new Date(round.end_at)) {
      await this.lockRound(null, true);
    } else {
      this.scheduleRoundAutoLockIfNeeded(round);
    }
  }

  startScheduler(intervalMs = 60 * 1000) {
    if (this.schedulerStarted) return;
    this.schedulerStarted = true;

    this.processDueRoundLocks().catch((err) => {
      console.error("ROUND SCHEDULER STARTUP ERROR:", err.message);
    });

    setInterval(() => {
      this.processDueRoundLocks().catch((err) => {
        console.error("ROUND SCHEDULER ERROR:", err.message);
      });
    }, intervalMs);
  }

  async getLatestRound() {
  return await repo.getLatestRound();
}

async getReadableRound() {
  await this.autoLockIfNeeded();
  return await repo.getLatestRound();
}

async handleLockRoundBackground(round, isAuto) {
  try {
    console.log("🚀 Lock background started for round:", round.id);

    // 🔹 1. Get non-submitters
    const nonSubmitters = await db.query(`
      SELECT s.id, s.user_id, s.name, s.email
      FROM preference_submission_status pss
      JOIN staff s ON s.id = pss.staff_id
      WHERE pss.round_id = $1
        AND pss.status = 'NON_SUBMITTER'
    `, [round.id]);

    const deadline = new Date(round.end_at).toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // 🔹 2. Send emails + notifications to non-submitters (parallel, safe)
    await Promise.all(
      nonSubmitters.rows.map(async (ta) => {
        await Promise.all([
          (async () => {
            try {
              await this.safeSendEmail(
                ta.email,
                "Missed Preference Deadline",
                `Hello ${ta.name},

Semester: ${round.semester}
Deadline: ${deadline}

You missed the submission.`
              );
              console.log("📧 Email sent to:", ta.email);
            } catch (err) {
              console.error("❌ Email failed:", ta.email, err.message);
            }
          })(),

          (async () => {
            try {
              await notificationService.createSystemNotification(
                ta.user_id,
                "Preference Deadline Missed",
                `Semester: ${round.semester}
Deadline: ${deadline}`,
                "ROUND_MISSED_DEADLINE",
                round.id,
                null
              );
              console.log("🔔 Notification sent to:", ta.user_id);
            } catch (err) {
              console.error("❌ Notification failed:", ta.user_id, err.message);
            }
          })()
        ]);
      })
    );

    // 🔹 3. Get summary
    const summary = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS submitted,
        COUNT(*) FILTER (WHERE status = 'NON_SUBMITTER') AS non_submitters
      FROM preference_submission_status
      WHERE round_id = $1
    `, [round.id]);

    const result = summary.rows[0];

    // 🔹 4. Get coordinator
    const coordinator = await this.getCoordinatorUser();

    // 🔹 5. Send coordinator email + notification (parallel + safe)
    await Promise.all([
      (async () => {
        try {
          console.log("📢 Sending coordinator notification...");

          await notificationService.createSystemNotification(
            coordinator.id, // ⚠️ change to coordinator.user_id if needed
            "Preference Round Summary",
            `Round ${round.id} has ended.

Submitted: ${result.submitted}
Non-submitters: ${result.non_submitters}`,
            "COORDINATOR_NOTICE",
            round.id,
            null
          );

          console.log("✅ Coordinator notification sent");

        } catch (err) {
          console.error("❌ Coordinator notification failed:", err.message);
        }
      })(),

      (async () => {
        try {
          await this.safeSendEmail(
            coordinator.email,
            isAuto ? "Preference Round Automatically Locked" : "Preference Round Summary",
            `The preference round has been locked.

Submitted: ${result.submitted}
Non-submitters: ${result.non_submitters}`
          );

          console.log("📧 Coordinator email sent");

        } catch (err) {
          console.error("❌ Coordinator email failed:", err.message);
        }
      })()
    ]);

    console.log("✅ Lock background finished successfully");

  } catch (err) {
    console.error("❌ Lock background failed:", err.message);
  }
}

async lockRound(userId = null, isAuto = false) {
  const round = await repo.getLatestRound();

  if (!round) throw new Error("No round exists");
  if (round.is_locked) throw new Error("Round already locked");

  const lockedRound = await repo.lockRound(round.id, userId);

  if (!lockedRound) {
    return { message: "Round already locked" };
  }

  await db.query(`
    UPDATE preference_submission_status
    SET status = 'NON_SUBMITTER'
    WHERE round_id = $1
      AND status = 'NOT_SUBMITTED'
  `, [round.id]);

  // ✅ run background
  this.handleLockRoundBackground(lockedRound, isAuto);

  return { message: "Round locked successfully" };
}

  async getSubmissionStatus(roundId) {
    if (!roundId) {
      throw new Error("Round ID is required");
    }

    return await repo.getSubmissionStatus(roundId);
  }

  async ensureGenerationAllowed() {
    const latestRound = await this.autoLockIfNeeded();

    if (!latestRound) {
      throw new Error("No preference round exists");
    }

    if (!latestRound.is_locked) {
      const now = new Date();
      const start = new Date(latestRound.start_at);
      const end = new Date(latestRound.end_at);

      if (now < start) {
        throw new Error("Cannot generate plan before the preference round starts");
      }

      if (now >= start && now < end) {
        throw new Error("Cannot generate plan while the preference round is still open");
      }

      throw new Error("Cannot generate plan until the latest preference round is locked");
    }

    return latestRound;
  }

  async getAllRounds() {
  return await repo.getAllRounds();
}
}

module.exports = new PreferenceRoundService();
