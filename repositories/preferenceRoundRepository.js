const db = require("../db/database");

class PreferenceRoundRepository {
  
async createRound(startAt, endAt, userId, conflictResolutionMode, semester) {
  const result = await db.query(`
    INSERT INTO preference_round
      (start_at, end_at, opened_by_user_id, conflict_resolution_mode, semester)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [startAt, endAt, userId, conflictResolutionMode, semester]);

  return result.rows[0];
}

  async getLatestRound() {
    const result = await db.query(`
      SELECT *
      FROM preference_round
      ORDER BY id DESC
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

    async autoLockExpiredRounds() {
  await db.query(`
    UPDATE preference_round
    SET is_locked = TRUE
    WHERE is_locked = FALSE
      AND end_at <= CURRENT_TIMESTAMP
  `);
}

  async getActiveUnlockedRound() {
    const result = await db.query(`
      SELECT *
      FROM preference_round
      WHERE is_locked = FALSE
        AND end_at > NOW()
      ORDER BY id DESC
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  async lockRound(roundId, userId) {
    const result = await db.query(`
      UPDATE preference_round
      SET is_locked = TRUE,
          locked_by_user_id = $1
      WHERE id = $2
      RETURNING *
    `, [userId, roundId]);

    return result.rows[0];
  }

async initializeSubmissionStatus(roundId) {
  await db.query(`
    INSERT INTO preference_submission_status
      (round_id, staff_id, status, is_valid, submitted_at)
    SELECT
      $1,
      s.id,
      'NOT_SUBMITTED',
      FALSE,
      NULL
    FROM staff s
    WHERE LOWER(s.role) = 'ta'
    ON CONFLICT (round_id, staff_id) DO NOTHING
  `, [roundId]);
}

async updateSubmissionStatus(roundId, staffId, status, isValid, submittedAt) {
  const query = `
    UPDATE preference_submission_status
    SET status = $3,
        is_valid = $4,
        submitted_at = $5
    WHERE round_id = $1 AND staff_id = $2
  `;
  await db.query(query, [roundId, staffId, status, isValid, submittedAt]);
}

  async getSubmissionStatus(roundId) {
    const result = await db.query(`
      SELECT
        pss.id,
        pss.staff_id,
        s.name AS staff_name,
        s.email AS staff_email,
        pss.status,
        pss.is_valid,
        pss.submitted_at
      FROM preference_submission_status pss
      JOIN staff s ON s.id = pss.staff_id
      WHERE pss.round_id = $1
      ORDER BY s.name
    `, [roundId]);

    return result.rows;
  }
}

module.exports = new PreferenceRoundRepository();