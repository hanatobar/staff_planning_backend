const bcrypt = require('bcrypt');
const db = require("../db/database");
const staffRepository = require('../repositories/staffRepository');
const emailService = require("./emailService");

function generateDefaultPassword(name) {
  const cleanName = (name || "user").replace(/\s+/g, "").toLowerCase();
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${cleanName}@${randomPart}`;
}

async function addStaff(name, email, role, maxWorkload, priorityRank) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const normalizedRole = role.trim().toUpperCase();

  if (normalizedRole !== "TA") {
    throw new Error("TA Management only allows adding TAs");
  }

  const existingUser = await db.query(
    "SELECT id FROM users WHERE email = $1",
    [trimmedEmail]
  );

  if (existingUser.rows.length > 0) {
    throw new Error("Email already exists");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const priorityResult = await client.query(`
      SELECT COALESCE(MAX(priority_rank), 0) AS max_priority
      FROM staff
      WHERE LOWER(role) = 'ta'
    `);

    const finalPriority = Number(priorityResult.rows[0].max_priority) + 1;

    const defaultPassword = generateDefaultPassword(trimmedName);
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const userResult = await client.query(
      `
      INSERT INTO users (name, email, password, role, is_password_set)
      VALUES ($1, $2, $3, 'TA', FALSE)
      RETURNING id
      `,
      [trimmedName, trimmedEmail, hashedPassword]
    );

    const userId = userResult.rows[0].id;

    await client.query(
      `
      INSERT INTO staff (name, email, role, max_workload, user_id, priority_rank)
      VALUES ($1, $2, 'TA', $3, $4, $5)
      `,
      [trimmedName, trimmedEmail, maxWorkload, userId, finalPriority]
    );

    await client.query("COMMIT");

    await emailService.sendEmail(
      trimmedEmail,
      "Your GUC Staff Planning Tool account",
      `Hello ${trimmedName},

Your TA account has been created in the GUC Staff Planning Tool.

Email: ${trimmedEmail}
Default Password: ${defaultPassword}

Please log in using this password. After login, you will be redirected to set a new password.

Best regards,
Staff Planning System`
    );

    return {
      message: "TA added successfully and default password email sent"
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getAllStaff() {
  return await staffRepository.getAllStaff();
}

/**
 * Remove rows that block deleting a TA user/staff record (notifications, messages,
 * appeals, assignments, preferences, conflict links).
 *
 * Uses EXISTS … FROM staff so we always match the DB user_id (avoids JS bigint /
 * truthy bugs) while the staff row is still present.
 */
async function deleteStaffRelatedData(client, staffId) {
  const sid = Number(staffId);

  await client.query(
    `
    DELETE FROM notification n
    WHERE EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = $1
        AND s.user_id IS NOT NULL
        AND n.recipient_user_id = s.user_id
    )
    `,
    [sid]
  );

  await client.query(
    `
    DELETE FROM message m
    WHERE EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = $1
        AND s.user_id IS NOT NULL
        AND (m.sender_user_id = s.user_id OR m.receiver_user_id = s.user_id)
    )
    `,
    [sid]
  );

  await client.query(
    `
    UPDATE assignment_appeal aa
    SET reviewed_by_user_id = NULL
    FROM staff s
    WHERE s.id = $1
      AND s.user_id IS NOT NULL
      AND aa.reviewed_by_user_id = s.user_id
    `,
    [sid]
  );

  await client.query(
    `
    UPDATE preference_round pr
    SET opened_by_user_id = NULL
    FROM staff s
    WHERE s.id = $1
      AND s.user_id IS NOT NULL
      AND pr.opened_by_user_id = s.user_id
    `,
    [sid]
  );

  await client.query(
    `
    UPDATE preference_round pr
    SET locked_by_user_id = NULL
    FROM staff s
    WHERE s.id = $1
      AND s.user_id IS NOT NULL
      AND pr.locked_by_user_id = s.user_id
    `,
    [sid]
  );

  await client.query(
    `
    DELETE FROM message
    WHERE assignment_id IN (SELECT id FROM assignment WHERE staff_id = $1)
       OR appeal_id IN (SELECT id FROM assignment_appeal WHERE staff_id = $1)
       OR conflict_id IN (
            SELECT conflict_id FROM assignment_conflict_staff WHERE staff_id = $1
          )
    `,
    [sid]
  );

  await client.query(
    `
    DELETE FROM notification
    WHERE assignment_id IN (SELECT id FROM assignment WHERE staff_id = $1)
    `,
    [sid]
  );

  await client.query(
    `
    DELETE FROM assignment_appeal_compensation
    WHERE appeal_id IN (SELECT id FROM assignment_appeal WHERE staff_id = $1)
       OR source_assignment_id IN (SELECT id FROM assignment WHERE staff_id = $1)
    `,
    [sid]
  );

  await client.query(
    `
    DELETE FROM assignment_appeal_redistribution
    WHERE appeal_id IN (SELECT id FROM assignment_appeal WHERE staff_id = $1)
       OR target_staff_id = $1
    `,
    [sid]
  );

  await client.query(
    `DELETE FROM assignment_appeal WHERE staff_id = $1`,
    [sid]
  );

  await client.query(
    `DELETE FROM assignment_conflict_staff WHERE staff_id = $1`,
    [sid]
  );

  await client.query(
    `
    DELETE FROM assignment_conflict_staff
    WHERE conflict_id IN (
      SELECT id FROM assignment_conflict WHERE chosen_staff_id = $1
    )
    `,
    [sid]
  );

  await client.query(
    `DELETE FROM assignment_conflict WHERE chosen_staff_id = $1`,
    [sid]
  );

  await client.query(
    `DELETE FROM assignment WHERE staff_id = $1`,
    [sid]
  );

  await client.query(
    `DELETE FROM preference WHERE staff_id = $1`,
    [sid]
  );

  await client.query(
    `DELETE FROM preference_submission_status WHERE staff_id = $1`,
    [sid]
  );
}

async function deleteStaff(id) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existingStaff = await client.query(
      `SELECT * FROM staff WHERE id = $1`,
      [id]
    );

    if (existingStaff.rows.length === 0) {
      throw new Error("Staff member not found");
    }

    const staff = existingStaff.rows[0];
    const role = String(staff.role || "").toUpperCase();
    const oldPriority = Number(staff.priority_rank || 0);
    const userId = staff.user_id;

    await deleteStaffRelatedData(client, id);

    await client.query(
      `DELETE FROM staff WHERE id = $1`,
      [id]
    );

    if (userId != null && userId !== "") {
      await client.query(
        `DELETE FROM users WHERE id = $1`,
        [userId]
      );
    }

    if (role === "TA" && oldPriority > 0) {
      await client.query(`
        UPDATE staff
        SET priority_rank = priority_rank - 1
        WHERE LOWER(role) = 'ta'
          AND priority_rank > $1
      `, [oldPriority]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateStaff(id, name, email, role, maxWorkload, priorityRank) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existingStaff = await client.query(
      `SELECT * FROM staff WHERE id = $1`,
      [id]
    );

    if (existingStaff.rows.length === 0) {
      throw new Error("TA not found");
    }

    const currentStaff = existingStaff.rows[0];

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const normalizedRole = role.trim().toUpperCase();

    if (normalizedRole !== "TA") {
      throw new Error("TA Management only allows TA records");
    }

    if (!trimmedName || !trimmedEmail) {
      throw new Error("Name and email are required");
    }

    if (maxWorkload <= 0) {
      throw new Error("Max workload must be greater than zero");
    }

    const emailConflictUser = await client.query(
      `SELECT id FROM users WHERE email = $1 AND id <> $2`,
      [trimmedEmail, currentStaff.user_id]
    );

    if (emailConflictUser.rows.length > 0) {
      throw new Error("Another user already uses this email");
    }

    const emailConflictStaff = await client.query(
      `SELECT id FROM staff WHERE email = $1 AND id <> $2`,
      [trimmedEmail, id]
    );

    if (emailConflictStaff.rows.length > 0) {
      throw new Error("Another TA already uses this email");
    }

    await client.query(`
      UPDATE users
      SET name = $1,
          email = $2,
          role = 'TA'
      WHERE id = $3
    `, [trimmedName, trimmedEmail, currentStaff.user_id]);

    await client.query(`
      UPDATE staff
      SET name = $1,
          email = $2,
          role = 'TA',
          max_workload = $3
      WHERE id = $4
    `, [trimmedName, trimmedEmail, maxWorkload, id]);

    await client.query("COMMIT");

    return { message: "TA updated successfully" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateTaPriorityOrder(staffIds) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    if (!Array.isArray(staffIds) || staffIds.length === 0) {
      throw new Error("TA priority order is required");
    }

    const result = await client.query(`
      SELECT id
      FROM staff
      WHERE LOWER(role) = 'ta'
      ORDER BY priority_rank ASC, id ASC
    `);

    const existingTaIds = result.rows.map(r => Number(r.id));
    const incomingIds = staffIds.map(id => Number(id));

    if (existingTaIds.length !== incomingIds.length) {
      throw new Error("Priority list does not match current TA count");
    }

    const existingSet = new Set(existingTaIds);
    const incomingSet = new Set(incomingIds);

    if (existingSet.size !== incomingSet.size) {
      throw new Error("Invalid TA priority list");
    }

    for (const id of incomingIds) {
      if (!existingSet.has(id)) {
        throw new Error("Priority list contains invalid TA ids");
      }
    }

    await staffRepository.updateTaPriorityOrder(client, incomingIds);

    await client.query("COMMIT");

    return { message: "TA priority order updated successfully" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  addStaff,
  getAllStaff,
  deleteStaff,
  updateStaff,
  updateTaPriorityOrder
};