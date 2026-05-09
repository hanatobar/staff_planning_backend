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
    ORDER BY priority_rank ASC
  `);

  return result.rows;
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
  const cleanIds = staffIds.map((rawId, index) => {
    console.log("RAW ID:", rawId, "TYPE:", typeof rawId);

    if (rawId === null || rawId === undefined) {
      throw new Error(`ID is null at index ${index}`);
    }

    const id = Number(rawId);

    if (!Number.isFinite(id) || !Number.isInteger(id)) {
      throw new Error(`Invalid ID at index ${index}: ${rawId}`);
    }

    return id;
  });

  const existing = await client.query(
    `
    SELECT user_id
    FROM staff
    WHERE LOWER(role) = 'ta'
      AND user_id = ANY($1::int[])
    `,
    [cleanIds]
  );

  if (existing.rowCount !== cleanIds.length) {
    const foundIds = new Set(existing.rows.map((row) => Number(row.user_id)));
    const missingIds = cleanIds.filter((id) => !foundIds.has(id));
    throw new Error(`No staff found for user_id: ${missingIds.join(", ")}`);
  }

  await client.query(
    `
    UPDATE staff
    SET priority_rank = -array_position($1::int[], user_id)
    WHERE LOWER(role) = 'ta'
      AND user_id = ANY($1::int[])
    `,
    [cleanIds]
  );

  await client.query(
    `
    UPDATE staff
    SET priority_rank = array_position($1::int[], user_id)
    WHERE LOWER(role) = 'ta'
      AND user_id = ANY($1::int[])
    `,
    [cleanIds]
  );
}
}

module.exports = new StaffRepository();
