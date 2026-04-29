const db = require("../db/database");

class PreferenceRepository {

  async addPreference(staff_id, course_id, preference_level, round_id) {

    const query = `
      INSERT INTO preference (staff_id, course_id, preference_level, round_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [staff_id, course_id, preference_level, round_id];

    const result = await db.query(query, values);

    return result.rows[0];
  }

  async getPreferencesByStaff(staff_id, round_id) {

  const query = `
    SELECT 
      p.id,
      p.staff_id,
      p.course_id,
      p.preference_level,
      c.name AS course_name
    FROM preference p
    JOIN course c ON p.course_id = c.id
    WHERE p.staff_id = $1 AND p.round_id = $2
    ORDER BY p.preference_level
  `;

  const result = await db.query(query, [staff_id, round_id]);

  return result.rows;
}
async updatePreference(id, level){

  const query = `
    UPDATE preference
    SET preference_level = $1
    WHERE id = $2
  `;

  await db.query(query,[level,id]);
}
async getPreferenceByCourse(staff_id, course_id){

  const query = `
    SELECT * FROM preference
    WHERE staff_id = $1 AND course_id = $2
  `;

  const result = await db.query(query,[staff_id,course_id]);

  return result.rows[0];
}

async getAllPreferences(round_id) {
  const query = `
    SELECT 
      p.id,
      p.staff_id,
      p.course_id,
      p.preference_level,
      s.name AS staff_name,
      c.name AS course_name
    FROM preference p
    JOIN staff s ON p.staff_id = s.id
    JOIN course c ON p.course_id = c.id
    WHERE p.round_id = $1
    ORDER BY s.name, p.preference_level
  `;

  const result = await db.query(query, [round_id]);

  return result.rows;
}
async getPreferenceById(id){

  const query = `
    SELECT * FROM preference
    WHERE id = $1
  `;

  const result = await db.query(query,[id]);

  return result.rows[0];

}
async getPreferenceByLevel(staffId, level, round_id){

  const query = `
    SELECT * FROM preference
    WHERE staff_id = $1 AND preference_level = $2 AND round_id = $3
  `;

  const result = await db.query(query,[staffId, level, round_id]);

  return result.rows[0];

}
async deletePreferencesByStaff(staffId, round_id) {

  const query = `
    DELETE FROM preference
    WHERE staff_id = $1 AND round_id = $2
  `;

  await db.query(query,[staffId, round_id]);

}
}

module.exports = new PreferenceRepository();