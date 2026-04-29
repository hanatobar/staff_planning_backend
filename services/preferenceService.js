const preferenceRepository = require("../repositories/preferenceRepository");
const db = require("../db/database");
const roundRepo = require("../repositories/preferenceRoundRepository");
const roundService = require("./preferenceRoundService");

class PreferenceService {

async validateRoundIsOpen() {
  const round = await roundService.autoLockIfNeeded();

  if (!round) {
    throw new Error("No preference round exists");
  }

  const now = new Date();
  const start = new Date(round.start_at);
  const end = new Date(round.end_at);

  if (round.is_locked) {
    throw new Error("Preference round is locked");
  }

  if (now < start) {
    throw new Error("Preference round has not started yet");
  }

  if (now > end) {
    throw new Error("Preference round has already ended");
  }

  return round;
}

  async recomputeSubmissionStatus(staffId, roundId) {
    const result = await db.query(`
      SELECT course_id, preference_level
      FROM preference
      WHERE staff_id = $1 AND round_id = $2
      ORDER BY preference_level
    `, [staffId, roundId]);

    const prefs = result.rows;

    if (prefs.length === 0) {
      await roundRepo.updateSubmissionStatus(
        roundId,
        staffId,
        "NOT_SUBMITTED",
        false,
        null
      );
      return;
    }

    const courseSet = new Set();
    const levelSet = new Set();
    let valid = true;

    for (const p of prefs) {
      if (courseSet.has(p.course_id)) valid = false;
      if (levelSet.has(p.preference_level)) valid = false;

      courseSet.add(p.course_id);
      levelSet.add(p.preference_level);
    }

    await roundRepo.updateSubmissionStatus(
      roundId,
      staffId,
      valid ? "SUBMITTED" : "NOT_SUBMITTED",
      valid,
      valid ? new Date() : null
    );
  }

async addPreference(staff_id, course_id, preference_level) {
  const round = await this.validateRoundIsOpen();

  const allowedCourseIds = await this.getCurrentRoundSemesterCourses(round.id);

  if (!allowedCourseIds.includes(Number(course_id))) {
    throw new Error("Selected course does not belong to the current round semester");
  }

  await preferenceRepository.addPreference(
    staff_id,
    course_id,
    preference_level,
    round.id
  );

  await this.recomputeSubmissionStatus(staff_id, round.id);

  return { message: "Preference added successfully" };
}

async getPreferencesByStaff(staff_id) {
  const round = await roundService.getCurrentRound();

  if (!round) {
    return [];
  }

  return await preferenceRepository.getPreferencesByStaff(staff_id, round.id);
}

async getCurrentRoundSemesterCourses(roundId) {
  const result = await db.query(`
    SELECT c.id
    FROM course c
    JOIN preference_round pr ON LOWER(TRIM(c.semester)) = LOWER(TRIM(pr.semester))
    WHERE pr.id = $1
  `, [roundId]);

  return result.rows.map(r => Number(r.id));
}

  async updatePreference(id, newLevel) {
    const round = await this.validateRoundIsOpen();

    const current = await preferenceRepository.getPreferenceById(id);

    if (!current) {
      throw new Error("Preference not found");
    }

    if (Number(current.round_id) !== Number(round.id)) {
      throw new Error("Only preferences in the current round can be updated");
    }

    const existing = await preferenceRepository.getPreferenceByLevel(
      current.staff_id,
      newLevel,
      round.id
    );

    if (existing) {
      await preferenceRepository.updatePreference(
        existing.id,
        current.preference_level
      );
    }

    await preferenceRepository.updatePreference(id, newLevel);

    await this.recomputeSubmissionStatus(current.staff_id, round.id);

    return { message: "Preference updated successfully" };
  }

async getAllPreferences() {
  const round = await roundService.getCurrentRound();

  console.log("GET ALL PREFS ROUND =", round);

  if (!round) {
    return [];
  }

  const rows = await preferenceRepository.getAllPreferences(round.id);
  console.log("GET ALL PREFS COUNT =", rows.length, "ROUND ID =", round.id);

  return rows;
}

  async resetPreferences(staffId) {
    const round = await this.validateRoundIsOpen();

    await preferenceRepository.deletePreferencesByStaff(staffId, round.id);

    await this.recomputeSubmissionStatus(staffId, round.id);

    return { message: "Preferences reset successfully" };
  }
}

module.exports = new PreferenceService();