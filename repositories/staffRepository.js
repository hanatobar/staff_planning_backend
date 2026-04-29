const db = require("../db/database");

class StaffRepository {
  async getStaffByEmail(email) {
    const result = await db.query(`
      SELECT id
      FROM staff
      WHERE email = $1
    `, [email]);

    return result.rows[0];
  }

  async addStaff(name, email, role, maxWorkload, userId, priorityRank) {
    const result = await db.query(`
      INSERT INTO staff (name, email, role, max_workload, user_id, priority_rank)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, email, role, maxWorkload, userId, priorityRank]);

    return result.rows[0];
  }

  async addStaffWithClient(client, name, email, role, maxWorkload, userId, priorityRank) {
    const result = await client.query(`
      INSERT INTO staff (name, email, role, max_workload, user_id, priority_rank)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, email, role, maxWorkload, userId, priorityRank]);

    return result.rows[0];
  }

  async getAllStaff() {
    const result = await db.query(`
      SELECT *
      FROM staff
    `);

    return result.rows;
  }

  async deleteStaff(id) {
    await db.query(`
      DELETE FROM staff
      WHERE id = $1
    `, [id]);
  }

  async getStaffById(id) {
    const result = await db.query(`
      SELECT *
      FROM staff
      WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  async updateStaff(id, name, email, role, maxWorkload, priorityRank) {
    const result = await db.query(`
      UPDATE staff
      SET name = $1,
          email = $2,
          role = $3,
          max_workload = $4,
          priority_rank = $5
      WHERE id = $6
      RETURNING *
    `, [name, email, role, maxWorkload, priorityRank, id]);

    return result.rows[0];
  }

  async shiftPrioritiesForInsert(client, newPriority) {
    await client.query(`
      UPDATE staff
      SET priority_rank = priority_rank + 1
      WHERE LOWER(role) = 'ta'
        AND priority_rank >= $1
    `, [newPriority]);
  }

  async shiftPrioritiesForUpdate(client, oldPriority, newPriority, staffId) {
    if (newPriority < oldPriority) {
      await client.query(`
        UPDATE staff
        SET priority_rank = priority_rank + 1
        WHERE LOWER(role) = 'ta'
          AND id <> $1
          AND priority_rank >= $2
          AND priority_rank < $3
      `, [staffId, newPriority, oldPriority]);
    } else if (newPriority > oldPriority) {
      await client.query(`
        UPDATE staff
        SET priority_rank = priority_rank - 1
        WHERE LOWER(role) = 'ta'
          AND id <> $1
          AND priority_rank > $2
          AND priority_rank <= $3
      `, [staffId, oldPriority, newPriority]);
    }
  }

async updateTaPriorityOrder(client, staffIds) {
  // Phase 1: assign temporary negative priorities
  for (let i = 0; i < staffIds.length; i++) {
    await client.query(
      `
      UPDATE staff
      SET priority_rank = $1
      WHERE id = $2
        AND LOWER(role) = 'ta'
      `,
      [-(i + 1), staffIds[i]]
    );
  }

  // Phase 2: assign final priorities
  for (let i = 0; i < staffIds.length; i++) {
    await client.query(
      `
      UPDATE staff
      SET priority_rank = $1
      WHERE id = $2
        AND LOWER(role) = 'ta'
      `,
      [i + 1, staffIds[i]]
    );
  }
}
}

module.exports = new StaffRepository();