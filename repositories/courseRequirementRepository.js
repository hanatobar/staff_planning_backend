const db = require("../db/database");

class CourseRequirementRepository {

  async addRequirement(course_id, required_hours) {

    const query = `
      INSERT INTO course_requirements (course_id, required_hours)
      VALUES ($1, $2)
      RETURNING *
    `;

    const values = [course_id, required_hours];

    const result = await db.query(query, values);

    return result.rows[0];
  }

  async updateRequirement(id, hours){

  const query = `
    UPDATE course_requirements
    SET required_hours=$1
    WHERE id=$2
  `;

  await db.query(query, [hours, id]);

}

async getRequirementsBySemester(semester) {
  const query = `
    SELECT 
      cr.id,
      cr.course_id,
      cr.required_hours,
      c.name AS course_name,
      c.semester
    FROM course_requirements cr
    JOIN course c ON cr.course_id = c.id
    WHERE LOWER(TRIM(c.semester)) = LOWER(TRIM($1))
    ORDER BY c.name
  `;

  const result = await db.query(query, [semester]);
  return result.rows;
}

  async getAllRequirements() {

    const query = `
      SELECT 
        cr.id,
        cr.course_id,
        cr.required_hours,
        c.name AS course_name
      FROM course_requirements cr
      JOIN course c ON cr.course_id = c.id
      ORDER BY c.name
    `;

    const result = await db.query(query);

    return result.rows;
  }

}

module.exports = new CourseRequirementRepository();