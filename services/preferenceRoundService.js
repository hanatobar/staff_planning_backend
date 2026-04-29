const repo = require("../repositories/preferenceRoundRepository");
const emailService = require("./emailService");
const db = require("../db/database");
const notificationService = require("./notificationService");

class PreferenceRoundService {
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
  SELECT 1
  FROM course
  WHERE LOWER(TRIM(semester)) = $1
  LIMIT 1
`, [normalizedSemester]);

if (semesterExists.rows.length === 0) {
  throw new Error("Selected semester does not exist in courses");
}

    await this.autoLockIfNeeded();
    await repo.autoLockExpiredRounds();
    const activeRound = await repo.getActiveUnlockedRound();
    if (activeRound) {
      throw new Error("Cannot open a new round while another active unlocked round exists");
    }

const round = await repo.createRound(
  startAt,
  endAt,
  userId,
  conflictResolutionMode,
  normalizedSemester
);    await repo.initializeSubmissionStatus(round.id);

    await notificationService.schedule15MinReminderIfNeeded(round);

    const tas = await db.query(`
      SELECT id, user_id, name, email
      FROM staff
      WHERE LOWER(role) = 'ta'
    `);
      
const formattedEnd = new Date(endAt).toLocaleString('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const formattedStart = new Date(startAt).toLocaleString('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

for (const ta of tas.rows) {

await emailService.sendEmail(
  ta.email,
  "Preference Round Opened",
`Hello ${ta.name},

A new preference submission round is now available in the Staff Planning System.

Semester: ${normalizedSemester}
Start: ${formattedStart}
Deadline: ${formattedEnd}

Please review the available courses and submit your preferences before the deadline.

Regards,
Staff Planning System`
);

  // 🔥 NEW: NOTIFICATION
  await notificationService.createSystemNotification(
    ta.user_id,
    "Preference Round Created",
    `A new preference round has been created.
Semester: ${normalizedSemester}
Start: ${formattedStart}
Deadline: ${formattedEnd}

Please submit your preferences once the round starts and before the deadline.`,
    "ROUND_OPENED",
    round.id,
    null
  );
}

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

  async getLatestRound() {
  return await repo.getLatestRound();
}

async getReadableRound() {
  await this.autoLockIfNeeded();
  return await repo.getLatestRound();
}

  async lockRound(userId = null, isAuto = false) {
    const round = await repo.getLatestRound();

    if (!round) {
      throw new Error("No round exists");
    }

    if (round.is_locked) {
      throw new Error("Round already locked");
    }

    await repo.lockRound(round.id, userId);

    await db.query(`
      UPDATE preference_submission_status
      SET status = 'NON_SUBMITTER'
      WHERE round_id = $1
        AND status = 'NOT_SUBMITTED'
    `, [round.id]);

    const nonSubmitters = await db.query(`
      SELECT   s.id, s.user_id, s.name, s.email
      FROM preference_submission_status pss
      JOIN staff s ON s.id = pss.staff_id
      WHERE pss.round_id = $1
        AND pss.status = 'NON_SUBMITTER'
    `, [round.id]);

    for (const ta of nonSubmitters.rows) {
      await emailService.sendEmail(
        ta.email,
        "Missed Preference Deadline",
`Hello ${ta.name},

The preference submission deadline has passed, and no preference submission was received for the current round.

As a result, you will not be included in the automatic assignment process for this round.
Any necessary assignment handling will be completed manually by the coordinator.

Regards,
Staff Planning System`
      );
          await notificationService.createSystemNotification(
  ta.user_id,
  "Preference Deadline Missed",
  "You did not submit your preferences before the deadline. You will be handled manually by the coordinator.",
  "ROUND_MISSED_DEADLINE",
  round.id,
  null
);
    }



    const summary = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS submitted,
        COUNT(*) FILTER (WHERE status = 'NON_SUBMITTER') AS non_submitters
      FROM preference_submission_status
      WHERE round_id = $1
    `, [round.id]);

    const result = summary.rows[0];

const coordinator = await this.getCoordinatorUser();

await emailService.sendEmail(
  coordinator.email,
  isAuto ? "Preference Round Automatically Locked" : "Preference Round Summary",
`The preference round has been locked successfully.

Summary:
Submitted TAs: ${result.submitted}
Non-submitters: ${result.non_submitters}

Please review the round outcome and proceed with the next planning steps as needed.`
);

const coordinatorRes = await db.query(`
  SELECT id
  FROM users
  WHERE LOWER(role) = 'coordinator'
  ORDER BY id
  LIMIT 1
`);

if (coordinatorRes.rows.length > 0) {
  const coordinatorUserId = coordinatorRes.rows[0].id;

  await notificationService.createSystemNotification(
    coordinatorUserId,
    "Preference Round Summary",
    `Round ${round.id} has ended. Submitted: ${result.submitted}. Non-submitters: ${result.non_submitters}.`,
    "COORDINATOR_NOTICE",
    round.id,
    null
  );
}

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
}

module.exports = new PreferenceRoundService();