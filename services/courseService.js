const db = require("../db/database");
const courseRepository = require('../repositories/courseRepository');

async function addCourse(name, code, semester){

  return await courseRepository.addCourse(
    name,
    code,
    semester
  );

}



async function getAllCourses(){

  return await courseRepository.getAllCourses();

}

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
      ALTER TABLE course
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
      `
    );

    await client.query(
      `
      UPDATE course
      SET is_deleted = TRUE,
          code = CONCAT('deleted_', id, '_', code),
          semester = CONCAT('deleted_', id, '_', semester)
      WHERE id = $1
      `,
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

async function updateCourse(id, name, code, semester) {
  const cid = Number(id);

  if (!Number.isFinite(cid) || cid <= 0) {
    throw new Error("Invalid course id");
  }

  if (!name?.trim() || !code?.trim() || !semester?.trim()) {
    throw new Error("All course fields are required");
  }



  await courseRepository.updateCourse(
    cid,
    name.trim(),
    code.trim(),
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
