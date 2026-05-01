const db = require("../db/database");
const repo = require("../repositories/assignmentRepository");
const emailService = require("./emailService");
const roundService = require("./preferenceRoundService");
const notificationService = require("./notificationService");


class AssignmentService {
  async generatePlan() {

  const lockedRound = await roundService.ensureGenerationAllowed();
  const conflictMode = lockedRound.conflict_resolution_mode || "FAIRNESS";
  console.log("Generating plan for round:", lockedRound);

  await repo.clearAssignmentsByRound(lockedRound.id);
  await this.clearConflictsByRound(lockedRound.id);




const submittedTAIds = await this.getSubmittedTAIds(lockedRound.id);
  console.log("SUBMITTED TA IDS =", [...submittedTAIds]);


if (submittedTAIds.size === 0) {
  throw new Error("No submitted TAs found in the locked round");
}

const staffRes = await db.query(`
  SELECT id, name, max_workload, priority_rank
  FROM staff
  WHERE LOWER(role) = 'ta'
    AND id = ANY($1)
  ORDER BY id
`, [[...submittedTAIds]]);

const prefRes = await db.query(`
  SELECT p.staff_id, p.course_id, p.preference_level
  FROM preference p
  WHERE p.round_id = $1
    AND p.staff_id = ANY($2)
  ORDER BY p.preference_level ASC, p.staff_id ASC
`, [lockedRound.id, [...submittedTAIds]]);

const reqRes = await db.query(`
  SELECT
    cr.course_id,
    cr.required_hours
  FROM course_requirements cr
  JOIN course c ON c.id = cr.course_id
  WHERE LOWER(TRIM(c.semester)) = LOWER(TRIM($1))
  ORDER BY cr.course_id
`, [lockedRound.semester]);

    const staff = staffRes.rows;
    const preferences = prefRes.rows;
    const requirements = reqRes.rows;

    if (staff.length === 0) {
      throw new Error("No TAs found");
    }

    if (requirements.length === 0) {
      throw new Error("No course requirements found");
    }

    if (preferences.length === 0) {
      throw new Error("No preferences found");
    }

    const taMap = {};
    for (const s of staff) {
      taMap[s.id] = {
        id: Number(s.id),
        name: s.name,
        maxWorkload: Number(s.max_workload),
            priorityRank: Number(s.priority_rank),
        assignedHours: 0,
        remaining: Number(s.max_workload)
      };
    }

      if (conflictMode === "PRIORITY") {
  for (const ta of Object.values(taMap)) {
    if (!ta.priorityRank || ta.priorityRank <= 0) {
      throw new Error("All submitted TAs must have a valid priority rank for PRIORITY mode");
    }
  }
}

    const courseMap = {};
    for (const r of requirements) {
      courseMap[r.course_id] = {
        courseId: Number(r.course_id),
        requiredHours: Number(r.required_hours),
        remainingHours: Number(r.required_hours)
      };
    }

    const preferencesByCourseAndLevel = {};
    const preferenceLevels = new Set();
    const preferenceLookup = {};

    for (const p of preferences) {
      const courseId = Number(p.course_id);
      const level = Number(p.preference_level);
      const staffId = Number(p.staff_id);
      preferenceLookup[`${staffId}-${courseId}`] = level;

      if (!courseMap[courseId] || !taMap[staffId]) {
        continue;
      }

      if (!preferencesByCourseAndLevel[courseId]) {
        preferencesByCourseAndLevel[courseId] = {};
      }

      if (!preferencesByCourseAndLevel[courseId][level]) {
        preferencesByCourseAndLevel[courseId][level] = [];
      }

      preferencesByCourseAndLevel[courseId][level].push({
        staffId,
        courseId,
        level
      });

      preferenceLevels.add(level);
    }

    const preferredStaffIdsByCourse = {};

for (const p of preferences) {
  const courseId = Number(p.course_id);
  const staffId = Number(p.staff_id);

  if (!preferredStaffIdsByCourse[courseId]) {
    preferredStaffIdsByCourse[courseId] = new Set();
  }

  preferredStaffIdsByCourse[courseId].add(staffId);
}

    const sortedLevels = [...preferenceLevels].sort((a, b) => a - b);

    const conflicts = this.detectConflicts(preferencesByCourseAndLevel, conflictMode);

    const assignmentMap = {};

    for (const level of sortedLevels) {
      for (const courseIdStr of Object.keys(courseMap)) {
        const courseId = Number(courseIdStr);
        const course = courseMap[courseId];

        if (!course || course.remainingHours <= 0) {
          continue;
        }

        const levelPrefs = preferencesByCourseAndLevel[courseId]?.[level] || [];

        if (levelPrefs.length === 0) {
          continue;
        }

        let progress = true;

        while (course.remainingHours > 0 && progress) {
          progress = false;

let eligible = levelPrefs
  .map(p => taMap[p.staffId])
  .filter(ta => ta && ta.remaining > 0);

// prevent one TA from dominating too early
const filteredEligible = eligible.filter((ta) => {
  const loadRatio =
      ta.maxWorkload === 0 ? 1 : ta.assignedHours / ta.maxWorkload;
  return loadRatio < 0.9;
});

// use filtered list only if it still leaves at least one candidate
if (filteredEligible.length > 0) {
  eligible = filteredEligible;
}

if (eligible.length === 0) {
  break;
}

const selectionMode = this.getSelectionMode(conflictMode, levelPrefs);
const allowRandomTieBreak = this.shouldAllowRandomTieBreak(
  conflictMode,
  levelPrefs,
  selectionMode
);

this.sortEligibleTAs(eligible, selectionMode, {
  allowRandomTieBreak
});

const chosenTa = eligible[0];


          const conflict = this.findConflict(conflicts, courseId, level);
if (conflict && conflict.chosenStaffId === null) {
  conflict.chosenStaffId = chosenTa.id;
}
          const chunk = this.calculateChunk(
            chosenTa.remaining,
            course.remainingHours
          );

          if (chunk <= 0) {
            break;
          }

          const key = `${chosenTa.id}-${courseId}`;

          if (!assignmentMap[key]) {
            assignmentMap[key] = {
              staffId: chosenTa.id,
              courseId,
              hours: 0
            };
          }

          assignmentMap[key].hours += chunk;
          chosenTa.assignedHours += chunk;
          chosenTa.remaining -= chunk;
          course.remainingHours -= chunk;

          progress = true;
        }
      }
    }
for (const conflict of conflicts) {
  if (conflict.chosenStaffId === null) {
    conflict.status = "SKIPPED";
  } else {
    conflict.status = "RESOLVED";
  }
}
const protectedAssignments = new Set();

if (conflictMode === "PRIORITY") {
  for (const conflict of conflicts) {
    if (conflict.chosenStaffId !== null) {
      protectedAssignments.add(`${conflict.chosenStaffId}-${conflict.courseId}`);
    }
  }
}
        await this.saveConflicts(conflicts, lockedRound.id);
        await this.sendConflictEmails(conflicts);


    const unfilledBeforeFallback = Object.values(courseMap)
      .filter(c => c.remainingHours > 0)
      .map(c => ({
        courseId: c.courseId,
        remainingHours: c.remainingHours
      }));

await this.runFallbackAssignment(
  courseMap,
  taMap,
  assignmentMap,
  preferredStaffIdsByCourse
);


this.rebalanceAssignmentsForFairness(
  assignmentMap,
  taMap,
  preferenceLookup,
  1,
  protectedAssignments
);

for (const key of Object.keys(assignmentMap)) {
  const a = assignmentMap[key];

  if (a.hours <= 0) continue;

  await repo.insertAssignment(
    a.staffId,
    a.courseId,
    a.hours,
    lockedRound.id,
    "AUTO"
  );
}

    const finalUnfilled = Object.values(courseMap)
      .filter(c => c.remainingHours > 0)
      .map(c => ({
        courseId: c.courseId,
        remainingHours: c.remainingHours
      }));

    return {
      message: "Plan generated successfully",
      conflictsCount: conflicts.length,
      generatedAssignmentsCount: Object.keys(assignmentMap).length,
      unfilledBeforeFallbackCount: unfilledBeforeFallback.length,
      finalUnfilledCount: finalUnfilled.length
    };
  }

getLoadGap(taMap) {
  const tas = Object.values(taMap);

  if (tas.length === 0) return 0;

  const assigned = tas.map(t => Number(t.assignedHours));
  return Math.max(...assigned) - Math.min(...assigned);
}

shouldAllowRandomTieBreak(conflictMode, levelPrefs, selectionMode) {
  // Random tie-break is allowed only in FAIRNESS conflict cases:
  // same course + same preference level + equal fairness metrics
  return (
    conflictMode === "FAIRNESS" &&
    selectionMode === "FAIRNESS" &&
    Array.isArray(levelPrefs) &&
    levelPrefs.length > 1
  );
}


sortEligibleTAs(eligible, mode, options = {}) {
  const { allowRandomTieBreak = false } = options;

  eligible.sort((a, b) => {
    // FAIRNESS ratio
    const ratioA = a.maxWorkload === 0 ? 1 : a.assignedHours / a.maxWorkload;
    const ratioB = b.maxWorkload === 0 ? 1 : b.assignedHours / b.maxWorkload;

    // 🔥 HYBRID SCORE
    const priorityWeight = mode === "PRIORITY" ? 0.6 : 0.2;
    const fairnessWeight = 1 - priorityWeight;

    const scoreA =
      (a.priorityRank || 999) * priorityWeight +
      ratioA * fairnessWeight;

    const scoreB =
      (b.priorityRank || 999) * priorityWeight +
      ratioB * fairnessWeight;

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    if (a.assignedHours !== b.assignedHours) {
      return a.assignedHours - b.assignedHours;
    }

    if (allowRandomTieBreak) {
      return Math.random() - 0.5;
    }

    return a.id - b.id;
  });

  return eligible;
}
rebalanceAssignmentsForFairness(
  assignmentMap,
  taMap,
  preferenceLookup,
  maxGap = 1,
  protectedAssignments = new Set(),
  maxPreferenceDrop = 2
) {
  let changed = true;

  while (changed) {
    changed = false;

    const tas = Object.values(taMap).sort((a, b) => {
      if (b.assignedHours !== a.assignedHours) {
        return b.assignedHours - a.assignedHours;
      }
      return a.id - b.id;
    });

    if (tas.length < 2) break;

    const mostLoaded = tas[0];
    const leastLoaded = tas[tas.length - 1];

    const currentGap =
      Number(mostLoaded.assignedHours) - Number(leastLoaded.assignedHours);

    if (currentGap <= maxGap) {
      break;
    }

    const donorAssignments = Object.values(assignmentMap)
      .filter(a => {
        if (Number(a.staffId) !== Number(mostLoaded.id)) return false;
        if (Number(a.hours) <= 0) return false;

        const key = `${a.staffId}-${a.courseId}`;

        // In PRIORITY mode, keep at least 1 hour for the protected winner
        if (protectedAssignments.has(key) && Number(a.hours) <= 1) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const receiverLevelA =
          preferenceLookup[`${leastLoaded.id}-${a.courseId}`] ??
          Number.MAX_SAFE_INTEGER;

        const receiverLevelB =
          preferenceLookup[`${leastLoaded.id}-${b.courseId}`] ??
          Number.MAX_SAFE_INTEGER;

        if (receiverLevelA !== receiverLevelB) {
          return receiverLevelA - receiverLevelB;
        }

        return a.courseId - b.courseId;
      });

    for (const donor of donorAssignments) {
      const donorLevel =
        preferenceLookup[`${mostLoaded.id}-${donor.courseId}`];
      const receiverLevel =
        preferenceLookup[`${leastLoaded.id}-${donor.courseId}`];

      // Receiver must also prefer the course
      if (receiverLevel === undefined) {
        continue;
      }

      // Donor must have a valid preference level too
      if (donorLevel === undefined) {
        continue;
      }

      // Keep rebalancing preference-based:
      // receiver preference must not be much worse than donor preference
      if (receiverLevel > donorLevel + maxPreferenceDrop) {
        continue;
      }

      if (Number(donor.hours) <= 0) {
        continue;
      }

      // Move exactly 1 hour
      donor.hours -= 1;

      if (donor.hours === 0) {
        delete assignmentMap[`${donor.staffId}-${donor.courseId}`];
      }

      const receiverKey = `${leastLoaded.id}-${donor.courseId}`;

      if (!assignmentMap[receiverKey]) {
        assignmentMap[receiverKey] = {
          staffId: leastLoaded.id,
          courseId: donor.courseId,
          hours: 0
        };
      }

      assignmentMap[receiverKey].hours += 1;

      mostLoaded.assignedHours -= 1;
      mostLoaded.remaining += 1;

      leastLoaded.assignedHours += 1;
      leastLoaded.remaining -= 1;

      changed = true;
      break;
    }

    if (!changed) {
      break;
    }
  }
}

getSelectionMode(conflictMode, levelPrefs) {
  if (conflictMode === "PRIORITY" && levelPrefs.length > 1) {
    return "PRIORITY";
  }

  return "FAIRNESS";
}

detectConflicts(preferencesByCourseAndLevel, mode) {
  const conflicts = [];

  for (const courseIdStr of Object.keys(preferencesByCourseAndLevel)) {
    const courseId = Number(courseIdStr);
    const levels = preferencesByCourseAndLevel[courseId];

    for (const levelStr of Object.keys(levels)) {
      const level = Number(levelStr);
      const prefs = levels[level];

      if (prefs.length > 1) {
        conflicts.push({
          courseId,
          preferenceLevel: level,
          staffIds: prefs.map(p => p.staffId),
          chosenStaffId: null,
resolutionMethod: mode === "PRIORITY"
  ? "AUTO_PRIORITY"
  : "AUTO_FAIRNESS_RANDOM",
            status: "OPEN"
        });
      }
    }
  }

  return conflicts;
}

findConflict(conflicts, courseId, preferenceLevel) {
  return conflicts.find(
    c => c.courseId === courseId && c.preferenceLevel === preferenceLevel
  );
}

  calculateChunk(taRemaining, courseRemaining) {
    const maxPossible = Math.min( taRemaining, courseRemaining);

    if (maxPossible >= 1) {
      return 1;
    }



    return 0;
  }

async runFallbackAssignment(
  courseMap,
  taMap,
  assignmentMap,
  preferredStaffIdsByCourse
) {
  for (const courseIdStr of Object.keys(courseMap)) {
    const courseId = Number(courseIdStr);
    const course = courseMap[courseId];

    while (course.remainingHours > 0) {
      const preferredIds = preferredStaffIdsByCourse[courseId]
        ? [...preferredStaffIdsByCourse[courseId]]
        : [];

      // Stage 1: preferred TAs only
      let eligible = preferredIds
        .map(staffId => taMap[staffId])
        .filter(ta => ta && ta.remaining > 0);

      this.sortEligibleTAs(eligible, "FAIRNESS", {
        allowRandomTieBreak: false
      });

      // Stage 2: if no preferred TA is available, use any TA with remaining capacity
      if (eligible.length === 0) {
        eligible = Object.values(taMap)
          .filter(ta => ta.remaining > 0);

        this.sortEligibleTAs(eligible, "FAIRNESS", {
          allowRandomTieBreak: false
        });
      }

      if (eligible.length === 0) {
        break;
      }

      const chosenTa = eligible[0];
      const chunk = this.calculateChunk(
        chosenTa.remaining,
        course.remainingHours
      );

      if (chunk <= 0) {
        break;
      }

      const key = `${chosenTa.id}-${courseId}`;

      if (!assignmentMap[key]) {
        assignmentMap[key] = {
          staffId: chosenTa.id,
          courseId,
          hours: 0
        };
      }

      assignmentMap[key].hours += chunk;
      chosenTa.assignedHours += chunk;
      chosenTa.remaining -= chunk;
      course.remainingHours -= chunk;
    }
  }
}

async clearConflictsByRound(roundId) {
  await db.query(`
    DELETE FROM assignment_conflict_staff
    WHERE conflict_id IN (
      SELECT id FROM assignment_conflict WHERE round_id = $1
    )
  `, [roundId]);

  await db.query(
    "DELETE FROM assignment_conflict WHERE round_id = $1",
    [roundId]
  );
}

async saveConflicts(conflicts, roundId) {
  for (const conflict of conflicts) {
    const result = await db.query(
      `
      INSERT INTO assignment_conflict
      (round_id, course_id, preference_level, chosen_staff_id, resolution_method, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
      `,
      [
        roundId,
        conflict.courseId,
        conflict.preferenceLevel,
        conflict.chosenStaffId,
        conflict.resolutionMethod,
        conflict.status
      ]
    );

    const conflictId = result.rows[0].id;

    for (const staffId of conflict.staffIds) {
      await db.query(
        `
        INSERT INTO assignment_conflict_staff (conflict_id, staff_id)
        VALUES ($1, $2)
        `,
        [conflictId, staffId]
      );
    }
  }
}
async getCoordinatorUser() {
  const result = await db.query(`
    SELECT id, email
    FROM users
    WHERE UPPER(role) = 'COORDINATOR'
    ORDER BY id
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    throw new Error("No coordinator account found");
  }

  return result.rows[0];
}

async sendConflictEmails(conflicts) {
  for (const conflict of conflicts) {

    if (conflict.status === "SKIPPED") continue;

    // ✅ get course name
    const courseRes = await db.query(
      "SELECT name FROM course WHERE id = $1",
      [conflict.courseId]
    );

    const courseName = courseRes.rows[0]?.name || "Unknown Course";

    // ✅ get involved staff
    const result = await db.query(
      "SELECT id, user_id, email, name FROM staff WHERE id = ANY($1)",
      [conflict.staffIds]
    );

    const users = result.rows;
const coordinator = await this.getCoordinatorUser();

    // 📧 send to each TA
    for (const user of users) {
      await emailService.sendEmail(
        user.email,
        "Conflict Detected",
`Hello ${user.name},

A preference conflict has been identified for the course "${courseName}" at preference level ${conflict.preferenceLevel}.

A provisional assignment decision has been made automatically based on the current planning rules.

If you would like to discuss this case or need clarification, please contact the coordinator at ${coordinator.email}.

Regards,
Staff Planning System`
      );
      if( user.user_id){
      await notificationService.createSystemNotification(
  user.user_id,
  "Preference Conflict Detected",
  `A conflict was detected for course "${courseName}" at preference level ${conflict.preferenceLevel}. Please check with the coordinator if needed.`,
  "CONFLICT_DETECTED",
  null,
  null
);
    }
  }


    // 📧 ALSO send to coordinator

await emailService.sendEmail(
  coordinator.email,
  "Conflict Detected (Coordinator Notification)",
`Hello Coordinator,

A preference conflict has been detected for the course "${courseName}" at preference level ${conflict.preferenceLevel}.

Involved TAs:
${users.map(u => `- ${u.name}`).join("\n")}

A provisional assignment decision has been made automatically based on the current planning rules.

Please review this case in the system and make any adjustments if needed.

Regards,
Staff Planning System`
);

    const coordinatorRes = await db.query(`
  SELECT id
  FROM users
  WHERE LOWER(role) = 'coordinator'
  ORDER BY id
  LIMIT 1
`);

if (coordinatorRes.rows.length > 0) {
  const coordinatorId = coordinatorRes.rows[0].id;

  await notificationService.createSystemNotification(
    coordinatorId,
    "Conflict Detected",
    `A conflict was detected for course "${courseName}" at preference level ${conflict.preferenceLevel}. Involved TAs: ${users.map(u => u.name).join(", ")}.`,
    "CONFLICT_DETECTED",
    null,
    null
  );
}
  }
}

async sendApprovalEmails(assignments) {
  const assignmentsByStaff = {};
  const coordinator = await this.getCoordinatorUser();

  // group assignments by TA
  for (const a of assignments) {

    if (!assignmentsByStaff[a.staff_id]) {
      assignmentsByStaff[a.staff_id] = {
        name: a.staff_name,
        items: []
      };
    }

    assignmentsByStaff[a.staff_id].items.push({
      courseName: a.course_name,
      hours: a.assigned_hours
    });
  }

  const staffIds = Object.keys(assignmentsByStaff);

  if (staffIds.length === 0) return;

  const staffRes = await db.query(
    "SELECT id, email, user_id FROM staff WHERE id = ANY($1::int[])",
    [staffIds.map(Number)]
  );

  const staffById = new Map(staffRes.rows.map((row) => [Number(row.id), row]));

  const results = await Promise.allSettled(staffIds.map(async (staffId) => {
    const staff = staffById.get(Number(staffId));
    if (!staff || !staff.email) return;

    const email = staff.email;
    const userId = staff.user_id;
    const staffData = assignmentsByStaff[staffId];

    const assignmentList = staffData.items
      .map(item => `- ${item.courseName}: ${item.hours} hours`)
      .join("\n");

const message = `Hello ${staffData.name},

The final teaching plan has been approved, and your assignments for the current round are now confirmed.

Your assigned teaching load is:

${assignmentList}

Please log in to the Staff Planning System to review the full details.

If you have any questions, please contact the coordinator at ${coordinator.email}.

Regards,
Staff Planning System`;

    await emailService.sendEmail(
      email,
      "Final Teaching Assignments Approved",
      message
    );

    if(userId){
      await notificationService.createSystemNotification(
        Number(userId),
        "Final Plan Approved",
        "Your final assignments have been approved. Please check your teaching load in the system.",
        "PLAN_APPROVED",
        null,
        null
      );
    }
  }));

  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    console.error("APPROVAL EMAIL ERRORS:", failed.map((result) => result.reason));
  }
}

async getAssignments() {
  const round = await roundService.getCurrentRound();
  if (!round) return [];
  return await repo.getAllAssignments(round.id);
}

async approvePlan() {
  const round = await roundService.ensureGenerationAllowed();
  const generatedAssignments = (await repo.getAllAssignments(round.id))
    .filter((a) => a.status === "GENERATED");

  if (generatedAssignments.length === 0) {
    return { message: "Plan is already approved" };
  }

  await db.query(
    `
    UPDATE assignment
    SET status = 'APPROVED'
    WHERE round_id = $1
      AND status = 'GENERATED'
    `,
    [round.id]
  );

  const updatedAssignments = await repo.getAllAssignments(round.id);
  this.sendApprovalEmails(updatedAssignments).catch((err) => {
    console.error("APPROVAL EMAIL BACKGROUND ERROR:", err);
  });

  return { message: "Plan approved successfully. Emails are being sent." };
}

async getAssignmentsByStaff(staffId) {
  const round = await roundService.getCurrentRound();
  console.log("GET ASSIGNMENTS BY STAFF: staffId =", staffId, "round =", round);

  if (!round) return [];

  const rows = await repo.getAssignmentsByStaff(staffId, round.id);
  console.log("ASSIGNMENTS FOUND:", rows.length);

  return rows;
}

async getConflicts() {
  const round = await roundService.getCurrentRound();
  if (!round) return [];
  return await repo.getAllConflicts(round.id);
}



async getSubmittedTAIds(roundId) {
  const result = await db.query(`
    SELECT staff_id
    FROM preference_submission_status
    WHERE round_id = $1
      AND status = 'SUBMITTED'
      AND is_valid = TRUE
  `, [roundId]);

  return new Set(result.rows.map(r => Number(r.staff_id)));
}
async getAnalytics() {
  const round = await roundService.getCurrentRound();
  if (!round) {
    return {
      taStats: [],
      courseStats: [],
      fairnessSummary: {
        maxRatio: 0,
        minRatio: 0,
        ratioGap: 0,
        maxAssigned: 0,
        minAssigned: 0,
        hourGap: 0
      }
    };
  }

  const assignments = await repo.getAllAssignments(round.id);

  const staffRes = await db.query(`
    SELECT id, name, max_workload
    FROM staff
    WHERE LOWER(role) = 'ta'
  `);

const reqRes = await db.query(`
  SELECT
    cr.course_id,
    cr.required_hours,
    c.name AS course_name
  FROM course_requirements cr
  JOIN course c ON c.id = cr.course_id
  WHERE LOWER(TRIM(c.semester)) = LOWER(TRIM($1))
`, [round.semester]);

  const taStats = {};
  const courseStats = {};

  for (const s of staffRes.rows) {
    taStats[s.id] = {
      id: Number(s.id),
      name: s.name,
      assigned: 0,
      max: Number(s.max_workload),
      ratio: 0
    };
  }

  for (const r of reqRes.rows) {
courseStats[r.course_id] = {
  courseId: Number(r.course_id),
  courseName: r.course_name,
  assigned: 0,
  required: Number(r.required_hours),
  taCount: 0
};
  }

  // track distinct TAs per course
  const courseStaffSets = {};

  for (const a of assignments) {
    const staffId = Number(a.staff_id);
    const courseId = Number(a.course_id);
    const hours = Number(a.assigned_hours);

    if (taStats[staffId]) {
      taStats[staffId].assigned += hours;
    }

    if (courseStats[courseId]) {
      courseStats[courseId].assigned += hours;
    }

    if (!courseStaffSets[courseId]) {
      courseStaffSets[courseId] = new Set();
    }

    courseStaffSets[courseId].add(staffId);
  }

  // compute ratio per TA
  for (const ta of Object.values(taStats)) {
    ta.ratio = ta.max > 0 ? Number((ta.assigned / ta.max).toFixed(3)) : 0;
  }

  // compute TA count per course
  for (const course of Object.values(courseStats)) {
course.taCount = courseStaffSets[course.courseId]
  ? courseStaffSets[course.courseId].size
  : 0;
  }

  const taValues = Object.values(taStats);

  const ratios = taValues.map(t => t.ratio);
  const assigneds = taValues.map(t => t.assigned);

  const maxRatio = ratios.length ? Math.max(...ratios) : 0;
  const minRatio = ratios.length ? Math.min(...ratios) : 0;
  const maxAssigned = assigneds.length ? Math.max(...assigneds) : 0;
  const minAssigned = assigneds.length ? Math.min(...assigneds) : 0;

  return {
    taStats: taValues,
    courseStats: Object.values(courseStats),
    fairnessSummary: {
      maxRatio: Number(maxRatio.toFixed(3)),
      minRatio: Number(minRatio.toFixed(3)),
      ratioGap: Number((maxRatio - minRatio).toFixed(3)),
      maxAssigned,
      minAssigned,
      hourGap: maxAssigned - minAssigned
    }
  };
}

async getNonSubmitters() {
  const round = await roundService.getCurrentRound();
  if (!round) return [];
  return await repo.getNonSubmittersByRound(round.id);
}
async getUncoveredHours() {
  const round = await roundService.getCurrentRound();
  if (!round) return [];

  const data = await repo.getUncoveredHoursByRound(round.id);
  return data.filter(r => Number(r.uncovered_hours) > 0);
}

async assignUncoveredHours(targetStaffId, courseId, hours) {
  const round = await roundService.getCurrentRound();

  if (!round) {
    throw new Error("No current round found");
  }

  if (!round.is_locked) {
    throw new Error("Manual assignment is allowed only after the round is locked");
  }

  if (hours <= 0) {
    throw new Error("Hours must be greater than zero");
  }

  const nonSubmitters = await repo.getNonSubmittersByRound(round.id);
  const target = nonSubmitters.find(s => Number(s.staff_id) === Number(targetStaffId));

  if (!target) {
    throw new Error("Target TA is not a non-submitter in the current round");
  }

  const uncovered = await repo.getUncoveredHoursByRound(round.id);
  const course = uncovered.find(c => Number(c.course_id) === Number(courseId));

  if (!course) {
    throw new Error("Course not found");
  }

  if (Number(course.uncovered_hours) < Number(hours)) {
    throw new Error("Requested hours exceed uncovered hours");
  }

  const workloadRes = await db.query(`
    SELECT max_workload
    FROM staff
    WHERE id = $1
  `, [targetStaffId]);

  if (workloadRes.rows.length === 0) {
    throw new Error("Target TA not found");
  }

  const maxWorkload = Number(workloadRes.rows[0].max_workload);
  const currentAssigned = await repo.getTotalAssignedHoursForStaffInRound(targetStaffId, round.id);

  if (currentAssigned + Number(hours) > maxWorkload) {
    throw new Error("Target TA would exceed max workload");
  }

  const existingManual = await repo.getTargetManualAssignment(round.id, targetStaffId, courseId);

  if (existingManual) {
    await repo.addHoursToAssignment(existingManual.id, hours);
  } else {
    await repo.insertManualAssignment(targetStaffId, courseId, hours, round.id);
  }

  return { message: "Uncovered hours assigned successfully" };
}

async transferAssignmentHours(sourceAssignmentId, targetStaffId, hours) {
  const round = await roundService.getCurrentRound();

  if (!round) {
    throw new Error("No current round found");
  }

  if (!round.is_locked) {
    throw new Error("Manual transfer is allowed only after the round is locked");
  }

  if (hours <= 0) {
    throw new Error("Hours must be greater than zero");
  }

  const source = await repo.getAssignmentByIdInRound(sourceAssignmentId, round.id);

  if (!source) {
    throw new Error("Source assignment not found in the current round");
  }

  if (Number(source.assigned_hours) < Number(hours)) {
    throw new Error("Transfer hours exceed source assignment hours");
  }

  const nonSubmitters = await repo.getNonSubmittersByRound(round.id);
  const target = nonSubmitters.find(s => Number(s.staff_id) === Number(targetStaffId));

  if (!target) {
    throw new Error("Target TA is not a non-submitter in the current round");
  }

  if (Number(source.staff_id) === Number(targetStaffId)) {
    throw new Error("Source and target TA cannot be the same");
  }

  const workloadRes = await db.query(`
    SELECT max_workload
    FROM staff
    WHERE id = $1
  `, [targetStaffId]);

  if (workloadRes.rows.length === 0) {
    throw new Error("Target TA not found");
  }

  const maxWorkload = Number(workloadRes.rows[0].max_workload);
  const currentAssigned = await repo.getTotalAssignedHoursForStaffInRound(targetStaffId, round.id);

  if (currentAssigned + Number(hours) > maxWorkload) {
    throw new Error("Target TA would exceed max workload");
  }

  const existingManual = await repo.getTargetManualAssignment(
    round.id,
    targetStaffId,
    source.course_id
  );

  if (existingManual) {
    await repo.addHoursToAssignment(existingManual.id, hours);
  } else {
    await repo.insertManualAssignment(
      targetStaffId,
      source.course_id,
      hours,
      round.id
    );
  }

  const updatedSource = await repo.subtractHoursFromAssignment(source.id, hours);

  if (Number(updatedSource.assigned_hours) === 0) {
    await repo.deleteAssignment(source.id);
  }

  await repo.deleteZeroHourAssignmentsByRound(round.id);

  return { message: "Hours transferred successfully" };
}

async submitAppeal(assignmentId, staffId, appealedHours, reason) {
  const round = await roundService.getCurrentRound();

  if (!round) {
    throw new Error("No current round found");
  }

  if (appealedHours <= 0) {
    throw new Error("Appealed hours must be greater than zero");
  }

  if (!reason || !reason.trim()) {
    throw new Error("Reason is required");
  }

  const assignment = await repo.getAssignmentByIdInRound(assignmentId, round.id);

  if (!assignment) {
    throw new Error("Assignment not found in the current round");
  }

  if (Number(assignment.staff_id) !== Number(staffId)) {
    throw new Error("You can only appeal your own assignment");
  }

  if (Number(appealedHours) > Number(assignment.assigned_hours)) {
    throw new Error("Appealed hours exceed assigned hours");
  }

  const existingPending = await repo.getPendingAppealForAssignment(assignmentId);
  if (existingPending) {
    throw new Error("A pending appeal already exists for this assignment");
  }

  await repo.submitAppeal(
    assignmentId,
    staffId,
    round.id,
    appealedHours,
    reason.trim()
  );

  const coordinator = await this.getCoordinatorUser();
  await notificationService.createSystemNotification(
    Number(coordinator.id),
    "New Assignment Appeal",
    "A TA submitted a new assignment appeal. Please review it.",
    "APPEAL_SUBMITTED",
    round.id,
    assignmentId
  );

  return { message: "Appeal submitted successfully" };
}

async getAppealsByStaff(staffId) {
  const round = await roundService.getCurrentRound();
  if (!round) return [];
  return await repo.getAppealsByStaff(staffId, round.id);
}

async getAllAppeals() {
  const round = await roundService.getCurrentRound();
  if (!round) return [];
  return await repo.getAllAppeals(round.id);
}

async reviewAppeal(appealId, status, coordinatorResponse, reviewedByUserId) {
  const allowed = ["APPROVED", "REJECTED"];

  if (!allowed.includes(status)) {
    throw new Error("Invalid appeal status");
  }

  const appeal = await repo.getAppealById(appealId);
  if (!appeal) {
    throw new Error("Appeal not found");
  }

  if (appeal.status !== "PENDING") {
    throw new Error("Appeal has already been reviewed");
  }

  const updated = await repo.reviewAppeal(
    appealId,
    status,
    coordinatorResponse || "",
    reviewedByUserId
  );

  const staffRes = await db.query(`
    SELECT user_id
    FROM staff
    WHERE id = $1
  `, [appeal.staff_id]);

  if (staffRes.rows.length > 0 && staffRes.rows[0].user_id) {
const title =
  status === "APPROVED" ? "Appeal Approved" : "Appeal Rejected";

const body =
  coordinatorResponse && coordinatorResponse.trim()
    ? `Your appeal has been ${status.toLowerCase()}. Coordinator response: ${coordinatorResponse}`
    : `Your appeal has been ${status.toLowerCase()}.`;

await notificationService.createSystemNotification(
  Number(staffRes.rows[0].user_id),
  title,
  body,
  "APPEAL_REVIEWED",
  appeal.round_id,
  appeal.assignment_id
);
  }

  return {
    message: status === "APPROVED"
      ? "Appeal approved successfully"
      : "Appeal rejected successfully"
  };
}

async resolveAppeal(
  appealId,
  reviewedByUserId,
  coordinatorResponse,
  redistributions,
  compensations
) {
  const round = await roundService.getCurrentRound();

  if (!round) {
    throw new Error("No current round found");
  }

  const appeal = await repo.getAppealById(appealId);
  if (!appeal) {
    throw new Error("Appeal not found");
  }

  if (appeal.status !== "PENDING") {
    throw new Error("Appeal has already been reviewed");
  }

  const sourceAssignment = await repo.getAssignmentByIdInRound(
    appeal.assignment_id,
    round.id
  );

  if (!sourceAssignment) {
    throw new Error("Source assignment not found in current round");
  }

  const appealedHours = Number(appeal.appealed_hours);

  if (Number(sourceAssignment.assigned_hours) < appealedHours) {
    throw new Error("Appealed hours exceed source assignment hours");
  }

  if (!Array.isArray(redistributions) || redistributions.length === 0) {
    throw new Error("At least one redistribution item is required");
  }

  const totalRedistributed = redistributions.reduce(
    (sum, item) => sum + Number(item.hours || 0),
    0
  );

  if (totalRedistributed !== appealedHours) {
    throw new Error("Redistributed hours must exactly equal appealed hours");
  }

  // Validate redistributions: same course, valid target, workload safe
  for (const item of redistributions) {
    const targetStaffId = Number(item.targetStaffId);
    const hours = Number(item.hours);

    if (!targetStaffId || hours <= 0) {
      throw new Error("Invalid redistribution item");
    }

    if (targetStaffId === Number(sourceAssignment.staff_id)) {
      throw new Error("Redistribution target cannot be the same as the appealing TA");
    }

    const workloadRow = await repo.getStaffMaxWorkload(targetStaffId);
    if (!workloadRow) {
      throw new Error(`Target TA ${targetStaffId} not found`);
    }

    const currentAssigned = await repo.getTotalAssignedHoursForStaffInRound(
      targetStaffId,
      round.id
    );

    const maxWorkload = Number(workloadRow.max_workload);

    if (currentAssigned + hours > maxWorkload) {
      throw new Error(`Target TA ${targetStaffId} would exceed max workload`);
    }
  }

  // Apply redistribution of appealed hours from the source assignment
  for (const item of redistributions) {
    const targetStaffId = Number(item.targetStaffId);
    const hours = Number(item.hours);

    const existingTargetAssignment = await repo.getTargetAssignmentInRound(
      round.id,
      targetStaffId,
      sourceAssignment.course_id
    );

    if (existingTargetAssignment) {
      await repo.addHoursToAssignment(existingTargetAssignment.id, hours);
    } else {
      await repo.insertManualAssignment(
        targetStaffId,
        sourceAssignment.course_id,
        hours,
        round.id
      );
    }

    await repo.insertAppealRedistribution(
  appealId,
  targetStaffId,
  hours
);
  }

  const updatedSource = await repo.subtractHoursFromAssignment(
    sourceAssignment.id,
    appealedHours
  );

  if (Number(updatedSource.assigned_hours) === 0) {
    await repo.deleteAssignment(sourceAssignment.id);
  }

  // Optional compensation to the appealing TA
  if (Array.isArray(compensations)) {
    for (const item of compensations) {
      const sourceType = String(item.sourceType || "").toUpperCase();
      const hours = Number(item.hours);

      if (hours <= 0) {
        throw new Error("Compensation hours must be greater than zero");
      }

      const appealingStaffId = Number(appeal.staff_id);

      // Check appealing TA workload before applying each compensation item
      const workloadRow = await repo.getStaffMaxWorkload(appealingStaffId);
      if (!workloadRow) {
        throw new Error("Appealing TA not found");
      }

      const currentAssigned = await repo.getTotalAssignedHoursForStaffInRound(
        appealingStaffId,
        round.id
      );

      const maxWorkload = Number(workloadRow.max_workload);

      if (currentAssigned + hours > maxWorkload) {
        throw new Error("Appealing TA would exceed max workload");
      }

      if (sourceType === "UNCOVERED") {
        const courseId = Number(item.courseId);
        if (!courseId) {
          throw new Error("Compensation from uncovered hours requires courseId");
        }

        const uncovered = await repo.getUncoveredHoursByRound(round.id);
        const course = uncovered.find(c => Number(c.course_id) === courseId);

        if (!course) {
          throw new Error("Compensation uncovered course not found");
        }

        if (Number(course.uncovered_hours) < hours) {
          throw new Error("Compensation hours exceed uncovered hours");
        }

        const existingAssignment = await repo.getTargetAssignmentInRound(
          round.id,
          appealingStaffId,
          courseId
        );

        if (existingAssignment) {
          await repo.addHoursToAssignment(existingAssignment.id, hours);
        } else {
          await repo.insertManualAssignment(
            appealingStaffId,
            courseId,
            hours,
            round.id
          );
        }

        await repo.insertAppealCompensation(
  appealId,
  "UNCOVERED",
  courseId,
  null,
  hours
);
      } else if (sourceType === "TRANSFER") {
        const sourceAssignmentId = Number(item.sourceAssignmentId);

        if (!sourceAssignmentId) {
          throw new Error("Compensation from transfer requires sourceAssignmentId");
        }

        const transferSource = await repo.getAssignmentByIdInRound(
          sourceAssignmentId,
          round.id
        );

        if (!transferSource) {
          throw new Error("Compensation source assignment not found");
        }

        if (Number(transferSource.staff_id) === appealingStaffId) {
          throw new Error("Cannot transfer compensation from the same appealing TA");
        }

        if (Number(transferSource.assigned_hours) < hours) {
          throw new Error("Compensation transfer hours exceed source assignment hours");
        }

        const existingAssignment = await repo.getTargetAssignmentInRound(
          round.id,
          appealingStaffId,
          transferSource.course_id
        );

        if (existingAssignment) {
          await repo.addHoursToAssignment(existingAssignment.id, hours);
        } else {
          await repo.insertManualAssignment(
            appealingStaffId,
            transferSource.course_id,
            hours,
            round.id
          );
        }

        const updatedTransferSource = await repo.subtractHoursFromAssignment(
          transferSource.id,
          hours
        );

        await repo.insertAppealCompensation(
  appealId,
  "TRANSFER",
  null,
  sourceAssignmentId,
  hours
);

        if (Number(updatedTransferSource.assigned_hours) === 0) {
          await repo.deleteAssignment(transferSource.id);
        }
      } else {
        throw new Error(`Invalid compensation source type: ${sourceType}`);
      }
    }
  }

  await repo.reviewAppeal(
    appealId,
    "APPROVED",
    coordinatorResponse || "",
    reviewedByUserId
  );

  const staffRes = await db.query(`
    SELECT user_id
    FROM staff
    WHERE id = $1
  `, [appeal.staff_id]);

  if (staffRes.rows.length > 0 && staffRes.rows[0].user_id) {
const title = "Appeal Approved";

let compensationSummary = "No compensation was added.";

if (Array.isArray(compensations) && compensations.length > 0) {
  const parts = [];

  for (const item of compensations) {
    const sourceType = String(item.sourceType || "").toUpperCase();
    const hours = Number(item.hours || 0);

    if (sourceType === "UNCOVERED") {
      const courseRes = await db.query(
        `SELECT name FROM course WHERE id = $1`,
        [Number(item.courseId)]
      );

      const courseName = courseRes.rows[0]?.name || "Unknown Course";
      parts.push(`Uncovered ${courseName} (${hours}h)`);

    } else if (sourceType === "TRANSFER") {
      const sourceRes = await db.query(`
        SELECT
          c.name AS course_name,
          s.name AS staff_name
        FROM assignment a
        JOIN course c ON c.id = a.course_id
        JOIN staff s ON s.id = a.staff_id
        WHERE a.id = $1
      `, [Number(item.sourceAssignmentId)]);

      const row = sourceRes.rows[0];

      if (row) {
        parts.push(`Transfer from ${row.staff_name} - ${row.course_name} (${hours}h)`);
      } else {
        parts.push(`Transfer compensation (${hours}h)`);
      }
    }
  }

  compensationSummary = parts.join(", ");
}

const body =
  coordinatorResponse && coordinatorResponse.trim()
    ? `Your appeal has been approved. Compensation: ${compensationSummary}. Coordinator response: ${coordinatorResponse}`
    : `Your appeal has been approved. Compensation: ${compensationSummary}`;
    await notificationService.createSystemNotification(
      Number(staffRes.rows[0].user_id),
      title,
      body,
      "APPEAL_REVIEWED",
      appeal.round_id,
      appeal.assignment_id
    );
  }
  await repo.deleteZeroHourAssignmentsByRound(round.id);
  return { message: "Appeal resolved successfully" };
}

async getAppealDetails(appealId) {
  const appeal = await repo.getAppealById(appealId);

  if (!appeal) {
    throw new Error("Appeal not found");
  }

  const redistributions = await repo.getAppealRedistributions(appealId);
  const compensations = await repo.getAppealCompensations(appealId);

  return {
    redistributions,
    compensations
  };
}



}

module.exports = new AssignmentService();
