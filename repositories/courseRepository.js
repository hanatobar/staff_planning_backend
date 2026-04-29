const pool = require('../db/database');

async function addCourse(name, code, hours, semester) {

  const query = `
    INSERT INTO course (name, code, hours, semester)
    VALUES ($1,$2,$3,$4)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    name,
    code,
    hours,
    semester
  ]);

  return result.rows[0];
}

async function getAllCourses(){

  const query = `
    SELECT * FROM course
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

async function updateCourse(id, name, code, hours, semester) {
  const query = `
    UPDATE course
    SET name = $1,
        code = $2,
        hours = $3,
        semester = $4
    WHERE id = $5
    RETURNING *;
  `;

  const result = await pool.query(query, [
    name,
    code,
    hours,
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