const db = require("../db/database");

class AssignmentRepository {
  async clearAssignmentsByRound(roundId) {
    await db.query(
      "DELETE FROM assignment WHERE round_id = $1",
      [roundId]
    );
  }

  async insertAssignment(staffId, courseId, hours, roundId, assignmentType = "AUTO") {
    const query = `
      INSERT INTO assignment
      (staff_id, course_id, assigned_hours, status, created_at, round_id, assignment_type)
      VALUES ($1, $2, $3, 'GENERATED', CURRENT_TIMESTAMP, $4, $5)
    `;

    await db.query(query, [staffId, courseId, hours, roundId, assignmentType]);
  }

async getAllAssignments(roundId = null) {
  let query = `
    SELECT 
      a.id,
      a.staff_id,
      a.course_id,
      a.assigned_hours,
      a.status,
      a.created_at,
      a.round_id,
      a.assignment_type,
      s.name AS staff_name,
      c.name AS course_name
      FROM assignment a
      JOIN staff s ON a.staff_id = s.id
      JOIN course c ON a.course_id = c.id
      WHERE a.assigned_hours > 0
    `;
  const values = [];

  if (roundId !== null) {
    query += ` AND a.round_id = $1`;
    values.push(roundId);
  }

  query += ` ORDER BY a.created_at DESC, a.id DESC`;

  const result = await db.query(query, values);
  return result.rows;
}

async getAssignmentsByStaff(staffId, roundId = null) {
  let query = `
    SELECT 
      a.id,
      a.staff_id,
      a.course_id,
      a.assigned_hours,
      a.status,
      a.round_id,
      a.assignment_type,
      s.name AS staff_name,
      c.name AS course_name
    FROM assignment a
    JOIN staff s ON a.staff_id = s.id
    JOIN course c ON a.course_id = c.id
    WHERE a.staff_id = $1
      AND a.assigned_hours > 0
  `;
  const values = [staffId];

  if (roundId !== null) {
    query += ` AND a.round_id = $2`;
    values.push(roundId);
  }

  query += ` ORDER BY a.id DESC`;

  const result = await db.query(query, values);
  return result.rows;
}

  async getAssignmentById(id) {
    const result = await db.query(
      "SELECT * FROM assignment WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  async updateAssignmentStatus(id, status) {
    const result = await db.query(
      "UPDATE assignment SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    return result.rows[0];
  }

  async updateAssignmentHours(id, hours) {
    await db.query(
      "UPDATE assignment SET assigned_hours = $1 WHERE id = $2",
      [hours, id]
    );
  }

  async getAllConflicts(roundId = null) {
    let query = `
      SELECT
        ac.id,
        ac.course_id,
        c.name AS course_name,
        ac.preference_level,
        ac.chosen_staff_id,
        cs.name AS chosen_staff_name,
        ac.resolution_method,
        ac.status,
        ac.created_at,
        ac.round_id,
        STRING_AGG(s.name, ', ' ORDER BY s.name) AS involved_staff_names
      FROM assignment_conflict ac
      JOIN course c ON ac.course_id = c.id
      LEFT JOIN staff cs ON ac.chosen_staff_id = cs.id
      LEFT JOIN assignment_conflict_staff acs ON ac.id = acs.conflict_id
      LEFT JOIN staff s ON acs.staff_id = s.id
    `;

    const values = [];

    if (roundId !== null) {
      query += ` WHERE ac.round_id = $1`;
      values.push(roundId);
    }

    query += `
      GROUP BY
        ac.id,
        ac.course_id,
        c.name,
        ac.preference_level,
        ac.chosen_staff_id,
        cs.name,
        ac.resolution_method,
        ac.status,
        ac.created_at,
        ac.round_id
      ORDER BY ac.created_at DESC
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  async getAssignmentByIdInRound(id, roundId) {
  const result = await db.query(`
    SELECT *
    FROM assignment
    WHERE id = $1 AND round_id = $2
  `, [id, roundId]);

  return result.rows[0] || null;
}

async getTotalAssignedHoursForStaffInRound(staffId, roundId) {
  const result = await db.query(`
    SELECT COALESCE(SUM(assigned_hours), 0) AS total
    FROM assignment
    WHERE staff_id = $1 AND round_id = $2
  `, [staffId, roundId]);

  return Number(result.rows[0].total);
}

async getTargetManualAssignment(roundId, staffId, courseId) {
  const result = await db.query(`
    SELECT *
    FROM assignment
    WHERE round_id = $1
      AND staff_id = $2
      AND course_id = $3
      AND assignment_type = 'MANUAL'
      AND assigned_hours > 0
    LIMIT 1
  `, [roundId, staffId, courseId]);

  return result.rows[0] || null;
}

async deleteZeroHourAssignmentsByRound(roundId) {
  await db.query(`
    DELETE FROM assignment
    WHERE round_id = $1
      AND assigned_hours <= 0
  `, [roundId]);
}

async insertManualAssignment(staffId, courseId, hours, roundId) {
  const result = await db.query(`
    INSERT INTO assignment
    (staff_id, course_id, assigned_hours, status, created_at, round_id, assignment_type)
    VALUES ($1, $2, $3, 'GENERATED', CURRENT_TIMESTAMP, $4, 'MANUAL')
    RETURNING *
  `, [staffId, courseId, hours, roundId]);

  return result.rows[0];
}

async addHoursToAssignment(id, hours) {
  const result = await db.query(`
    UPDATE assignment
    SET assigned_hours = assigned_hours + $1
    WHERE id = $2
    RETURNING *
  `, [hours, id]);

  return result.rows[0];
}

async subtractHoursFromAssignment(id, hours) {
  const result = await db.query(`
    UPDATE assignment
    SET assigned_hours = assigned_hours - $1
    WHERE id = $2
    RETURNING *
  `, [hours, id]);

  return result.rows[0];
}

async deleteAssignment(id) {
  await db.query(`
    DELETE FROM assignment
    WHERE id = $1
  `, [id]);
}

async getUncoveredHoursByRound(roundId) {
  const result = await db.query(`
SELECT
  cr.course_id,
  c.name AS course_name,
  cr.required_hours,
  COALESCE(SUM(a.assigned_hours), 0) AS assigned_hours,
  cr.required_hours - COALESCE(SUM(a.assigned_hours), 0) AS uncovered_hours
FROM course_requirements cr
JOIN course c ON c.id = cr.course_id
JOIN preference_round pr ON pr.id = $1
LEFT JOIN assignment a
  ON a.course_id = cr.course_id
 AND a.round_id = $1
WHERE LOWER(TRIM(c.semester)) = LOWER(TRIM(pr.semester))
GROUP BY cr.course_id, c.name, cr.required_hours
ORDER BY c.name
  `, [roundId]);

  return result.rows;
}
async getNonSubmittersByRound(roundId) {
  const result = await db.query(`
    SELECT
      s.id AS staff_id,
      s.name AS staff_name,
      s.email AS staff_email,
      s.user_id
    FROM preference_submission_status pss
    JOIN staff s ON s.id = pss.staff_id
    WHERE pss.round_id = $1
      AND pss.status = 'NON_SUBMITTER'
    ORDER BY s.name
  `, [roundId]);

  return result.rows;
}

async submitAppeal(assignmentId, staffId, roundId, appealedHours, reason) {
  const result = await db.query(`
    INSERT INTO assignment_appeal
      (assignment_id, staff_id, round_id, appealed_hours, reason, status)
    VALUES ($1, $2, $3, $4, $5, 'PENDING')
    RETURNING *
  `, [assignmentId, staffId, roundId, appealedHours, reason]);

  return result.rows[0];
}

async getPendingAppealForAssignment(assignmentId) {
  const result = await db.query(`
    SELECT *
    FROM assignment_appeal
    WHERE assignment_id = $1
      AND status = 'PENDING'
    LIMIT 1
  `, [assignmentId]);

  return result.rows[0] || null;
}

async getAppealsByStaff(staffId, roundId = null) {
  let query = `
    SELECT
      aa.*,
      s.name AS staff_name,
      c.name AS course_name
    FROM assignment_appeal aa
    JOIN staff s ON s.id = aa.staff_id
    JOIN assignment a ON a.id = aa.assignment_id
    JOIN course c ON c.id = a.course_id
    WHERE aa.staff_id = $1
  `;
  const values = [staffId];

  if (roundId !== null) {
    query += ` AND aa.round_id = $2`;
    values.push(roundId);
  }

  query += ` ORDER BY aa.created_at DESC, aa.id DESC`;

  const result = await db.query(query, values);
  return result.rows;
}

async getAllAppeals(roundId = null) {
  let query = `
    SELECT
      aa.*,
      s.name AS staff_name,
      c.name AS course_name
    FROM assignment_appeal aa
    JOIN staff s ON s.id = aa.staff_id
    JOIN assignment a ON a.id = aa.assignment_id
    JOIN course c ON c.id = a.course_id
  `;
  const values = [];

  if (roundId !== null) {
    query += ` WHERE aa.round_id = $1`;
    values.push(roundId);
  }

  query += ` ORDER BY aa.created_at DESC, aa.id DESC`;

  const result = await db.query(query, values);
  return result.rows;
}

async getAppealById(id) {
  const result = await db.query(`
    SELECT *
    FROM assignment_appeal
    WHERE id = $1
  `, [id]);

  return result.rows[0] || null;
}

async reviewAppeal(appealId, status, coordinatorResponse, reviewedByUserId) {
  const result = await db.query(`
    UPDATE assignment_appeal
    SET status = $1,
        coordinator_response = $2,
        reviewed_by_user_id = $3,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
  `, [status, coordinatorResponse, reviewedByUserId, appealId]);

  return result.rows[0] || null;
}

async getAssignmentByIdWithCourse(id) {
  const result = await db.query(`
    SELECT *
    FROM assignment
    WHERE id = $1
  `, [id]);

  return result.rows[0] || null;
}

async getTargetAssignmentInRound(roundId, staffId, courseId) {
  const result = await db.query(`
    SELECT *
    FROM assignment
    WHERE round_id = $1
      AND staff_id = $2
      AND course_id = $3
      AND assigned_hours > 0
    LIMIT 1
  `, [roundId, staffId, courseId]);

  return result.rows[0] || null;
}

async getStaffMaxWorkload(staffId) {
  const result = await db.query(`
    SELECT max_workload
    FROM staff
    WHERE id = $1
  `, [staffId]);

  return result.rows[0] || null;
}

async getCourseRequirementsByCourseId(courseId) {
  const result = await db.query(`
    SELECT course_id, required_hours
    FROM course_requirements
    WHERE course_id = $1
  `, [courseId]);

  return result.rows[0] || null;
}

async insertAppealRedistribution(appealId, targetStaffId, hours) {
  const result = await db.query(`
    INSERT INTO assignment_appeal_redistribution
      (appeal_id, target_staff_id, hours)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [appealId, targetStaffId, hours]);

  return result.rows[0];
}

async insertAppealCompensation(
  appealId,
  sourceType,
  courseId = null,
  sourceAssignmentId = null,
  hours
) {
  const result = await db.query(`
    INSERT INTO assignment_appeal_compensation
      (appeal_id, source_type, course_id, source_assignment_id, hours)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [appealId, sourceType, courseId, sourceAssignmentId, hours]);

  return result.rows[0];
}

async getAppealRedistributions(appealId) {
  const result = await db.query(`
    SELECT
      ar.id,
      ar.appeal_id,
      ar.target_staff_id,
      s.name AS target_staff_name,
      ar.hours
    FROM assignment_appeal_redistribution ar
    JOIN staff s ON s.id = ar.target_staff_id
    WHERE ar.appeal_id = $1
    ORDER BY ar.id
  `, [appealId]);

  return result.rows;
}

async getAppealCompensations(appealId) {
  const result = await db.query(`
    SELECT
      ac.id,
      ac.appeal_id,
      ac.source_type,
      ac.course_id,
      COALESCE(c_direct.name, c_from_assignment.name) AS course_name,
      ac.source_assignment_id,
      sa.staff_id AS source_staff_id,
      ss.name AS source_staff_name,
      ac.hours
    FROM assignment_appeal_compensation ac
    LEFT JOIN course c_direct
      ON c_direct.id = ac.course_id
    LEFT JOIN assignment sa
      ON sa.id = ac.source_assignment_id
    LEFT JOIN course c_from_assignment
      ON c_from_assignment.id = sa.course_id
    LEFT JOIN staff ss
      ON ss.id = sa.staff_id
    WHERE ac.appeal_id = $1
    ORDER BY ac.id
  `, [appealId]);

  return result.rows;
}

}

module.exports = new AssignmentRepository();
