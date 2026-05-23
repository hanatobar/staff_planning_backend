const pool = require('../db/database');

async function addCourse(name, code, semester) {

  const query = `
    INSERT INTO course (name, code, semester)
    VALUES ($1,$2,$3)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    name,
    code,
    semester
  ]);

  return result.rows[0];
}

async function getAllCourses(){
  await pool.query(`
    ALTER TABLE course
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
  `);

  const query = `
    SELECT * FROM course
    WHERE COALESCE(is_deleted, FALSE) = FALSE
    ORDER BY id ASC
  `;

  const result = await pool.query(query);

  return result.rows;
}

async function deleteCourse(id){

  const query = `
    DELETE FROM course
    WHERE id = $1
  `;

  await pool.query(query,[id]);

}

async function updateCourse(id, name, code, semester) {
  const query = `
    UPDATE course
    SET name = $1,
        code = $2,
        semester = $3
    WHERE id = $4
    RETURNING *;
  `;

  const result = await pool.query(query, [
    name,
    code,
    semester,
    id
  ]);

  if (result.rows.length === 0) {
    throw new Error("Course not found");
  }

  return result.rows[0];
}

module.exports = {
  addCourse,
  getAllCourses,
  deleteCourse,
  updateCourse
};
