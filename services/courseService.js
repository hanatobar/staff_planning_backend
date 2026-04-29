const db = require("../db/database");
const courseRepository = require('../repositories/courseRepository');

async function addCourse(name, code, hours, semester){

  return await courseRepository.addCourse(
    name,
    code,
    hours,
    semester
  );

}

async function getAllCourses(){

  return await courseRepository.getAllCourses();

}

/**
 * Delete a course and all dependent rows (assignments, preferences, conflicts,
 * appeals, messages, notifications, requirements) in one transaction.
 */
async function deleteCourse(id) {
  const cid = Number(id);
  if (!Number.isFinite(cid) || cid <= 0) {
    throw new Error("Invalid course id");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const exists = await client.query(
      `SELECT 1 FROM course WHERE id = $1`,
      [cid]
    );
    if (exists.rows.length === 0) {
      throw new Error("Course not found");
    }

    await client.query(
      `
      DELETE FROM message
      WHERE assignment_id IN (SELECT id FROM assignment WHERE course_id = $1)
         OR appeal_id IN (
              SELECT aa.id
              FROM assignment_appeal aa
              JOIN assignment a ON a.id = aa.assignment_id
              WHERE a.course_id = $1
            )
         OR conflict_id IN (
              SELECT acs.conflict_id
              FROM assignment_conflict_staff acs
              JOIN assignment_conflict ac ON ac.id = acs.conflict_id
              WHERE ac.course_id = $1
            )
      `,
      [cid]
    );

    await client.query(
      `
      DELETE FROM notification
      WHERE assignment_id IN (SELECT id FROM assignment WHERE course_id = $1)
      `,
      [cid]
    );

    await client.query(
      `
      DELETE FROM assignment_appeal_compensation
      WHERE appeal_id IN (
            SELECT aa.id
            FROM assignment_appeal aa
            JOIN assignment a ON a.id = aa.assignment_id
            WHERE a.course_id = $1
          )
         OR source_assignment_id IN (SELECT id FROM assignment WHERE course_id = $1)
         OR course_id = $1
      `,
      [cid]
    );

    await client.query(
      `
      DELETE FROM assignment_appeal_redistribution
      WHERE appeal_id IN (
            SELECT aa.id
            FROM assignment_appeal aa
            JOIN assignment a ON a.id = aa.assignment_id
            WHERE a.course_id = $1
          )
      `,
      [cid]
    );

    await client.query(
      `
      DELETE FROM assignment_appeal
      WHERE assignment_id IN (SELECT id FROM assignment WHERE course_id = $1)
      `,
      [cid]
    );

    await client.query(
      `
      DELETE FROM assignment_conflict_staff
      WHERE conflict_id IN (
        SELECT id FROM assignment_conflict WHERE course_id = $1
      )
      `,
      [cid]
    );

    await client.query(
      `DELETE FROM assignment_conflict WHERE course_id = $1`,
      [cid]
    );

    await client.query(
      `DELETE FROM assignment WHERE course_id = $1`,
      [cid]
    );

    await client.query(
      `DELETE FROM preference WHERE course_id = $1`,
      [cid]
    );

    await client.query(
      `DELETE FROM course_requirements WHERE course_id = $1`,
      [cid]
    );

    await client.query(
      `DELETE FROM course WHERE id = $1`,
      [cid]
    );

    await client.query("COMMIT");
    return { message: "Course deleted successfully" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function updateCourse(id, name, code, hours, semester) {
  const cid = Number(id);

  if (!Number.isFinite(cid) || cid <= 0) {
    throw new Error("Invalid course id");
  }

  if (!name?.trim() || !code?.trim() || !semester?.trim()) {
    throw new Error("All course fields are required");
  }

  if (!hours || Number(hours) <= 0) {
    throw new Error("Course hours must be greater than zero");
  }

  await courseRepository.updateCourse(
    cid,
    name.trim(),
    code.trim(),
    Number(hours),
    semester.trim()
  );

  return { message: "Course updated successfully" };
}

module.exports = {
  addCourse,
  getAllCourses,
  deleteCourse,
  updateCourse
};
