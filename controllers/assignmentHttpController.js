const service = require("../services/assignmentService");

class AssignmentHttpController {

  async getAssignments(req, res) {
    try {
      const data = await service.getAssignments();

      const formatted = data.map(a => ({
        id: a.id,
        staffId: a.staff_id,
        courseId: a.course_id,
        assignedHours: a.assigned_hours,
        status: a.status,
        staffName: a.staff_name,
        courseName: a.course_name
      }));

      res.json(formatted);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAssignmentsByStaff(req, res) {
    try {
      const staffId = Number(req.params.id);

      const data = await service.getAssignmentsByStaff(staffId);

      const formatted = data.map(a => ({
        id: a.id,
        staffId: a.staff_id,
        courseId: a.course_id,
        assignedHours: a.assigned_hours,
        status: a.status,
        staffName: a.staff_name,
        courseName: a.course_name
      }));

      res.json(formatted);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAnalytics(req, res) {
    try {
      const data = await service.getAnalytics();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

async generatePlan(req, res) {
  try {
    // Wait for plan generation to complete before responding
    await service.generatePlan();
    console.log("✅ Plan generated");
    
    res.json({ message: "Plan generated successfully!" });
  } catch (err) {
    console.error("❌ Generation failed:", err.message);
    res.status(500).json({ error: err.message });
  }
}

  async approvePlan(req, res) {
    try {
      const result = await service.approvePlan();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

async getConflicts(req, res) {
  try {
    const data = await service.getConflicts();

    const formatted = data.map(c => ({
      id: c.id,
      courseId: c.course_id,
      courseName: c.course_name,
      status: c.status,
      preferenceLevel: c.preference_level,
      involvedStaffNames: c.involved_staff_names,
      chosenStaffName: c.chosen_staff_name || "",
      chosenStaffId: c.chosen_staff_id || 0,
      resolutionMethod: c.resolution_method,
    }));

    res.json({ conflicts: formatted });

  } catch (err) {
    console.error("GET CONFLICTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
async getAllAppeals(req, res) {
  try {
    const data = await service.getAllAppeals();
    res.json(data);
  } catch (err) {
    console.error("GET APPEALS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

async getAppealsByStaff(req, res) {
  try {
    const staffId = Number(req.params.id);

    const data = await service.getAppealsByStaff(staffId);

const formatted = data.map(a => ({
  id: a.id,
  staffId: a.staff_id,
  staffName: a.staff_name,
  courseName: a.course_name,
  appealedHours: a.appealed_hours,
  reason: a.reason,
  status: a.status,
  coordinatorResponse: a.coordinator_response || "",
  resolutionMethod: a.resolution_method || ""
}));

res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async getAppealDetails(req, res) {
  try {
    const id = Number(req.params.id);

    const data = await service.getAppealDetails(id);

    const redistributions = (data.redistributions || []).map(r => ({
      targetStaffId: r.target_staff_id,
      targetStaffName: r.target_staff_name, // ✅ FIXED
      hours: r.hours
    }));

    const compensations = (data.compensations || []).map(c => ({
  sourceType: c.source_type,
  courseName: c.course_name,
  sourceStaffName: c.source_staff_name,
  sourceAssignmentId: c.source_assignment_id,
  currentAssignmentHours:
    c.current_assignment_hours,
  hours: c.hours
}));

res.json({
  resolutionMethod: data.appeal?.resolution_method || "",
  status: data.appeal?.status || "",
  appealedHours: data.appeal?.appealed_hours || 0,
  coordinatorResponse:
      data.appeal?.coordinator_response || "",
  redistributions,
  compensations
});

  } catch (err) {
    console.error("DETAILS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}
async getUncoveredHours(req, res) {
  try {
    const data = await service.getUncoveredHours();
    res.json(data);
  } catch (err) {
    console.error("GET UNCOVERED ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

async submitAppeal(req, res) {
  try {
    const { assignmentId, staffId, appealedHours, reason } = req.body;

    const result = await service.submitAppeal(
      assignmentId,
      staffId,
      appealedHours,
      reason
    );

    res.json(result);

  } catch (err) {
    console.error("SUBMIT APPEAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

async reviewAppeal(req, res) {
  try {
    const { appealId, status, coordinatorResponse, reviewedByUserId } = req.body;

    const result = await service.reviewAppeal(
      Number(appealId),
      String(status).toUpperCase(), // 🔥 IMPORTANT
      coordinatorResponse,
      Number(reviewedByUserId)
    );

    res.json(result);

  } catch (err) {
    console.error("REVIEW APPEAL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}

async resolveAppeal(req, res) {
  try {
    const {
      appealId,
      reviewedByUserId,
      coordinatorResponse,
      redistributions,
      compensations,
      resolutionMethod
    } = req.body;

    const result = await service.resolveAppeal(
      Number(appealId),
      Number(reviewedByUserId),
      coordinatorResponse,
      redistributions,
      compensations,
      resolutionMethod
    );

    res.json(result);

  } catch (err) {
    console.error("RESOLVE APPEAL ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}

async transferAssignmentHours(req, res) {
  try {
    const { sourceAssignmentId, targetStaffId, hours } = req.body;

    const result = await service.transferAssignmentHours(
      sourceAssignmentId,
      targetStaffId,
      hours
    );

    res.json(result);

  } catch (err) {
    console.error("❌ TRANSFER ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
}

async swapAssignmentHours(req, res) {
  try {

    const {
      sourceAssignmentId,
      targetAssignmentId,
      hours
    } = req.body;

    const result =
      await service.swapAssignmentHours(
        sourceAssignmentId,
        targetAssignmentId,
        hours
      );

    res.json(result);

  } catch (err) {

    console.error("❌ SWAP ERROR:", err.message);

    res.status(400).json({
      error: err.message
    });
  }
}

async assignUncoveredHours(req, res) {
  try {

    const {
      targetStaffId,
      courseId,
      hours,
      releasedAssignments
    } = req.body;

    const result =
      await service.assignUncoveredHours(
        targetStaffId,
        courseId,
        hours,
        releasedAssignments || []
      );

    res.json(result);

  } catch (err) {

    console.error(
      "❌ ASSIGN ERROR:",
      err.message
    );

    res.status(500).json({
      error: err.message
    });
  }
}

async getAvailableTAs(req, res) {
  try {
    const data = await service.getAvailableTAs();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async getAssignmentsByRound(req, res) {
  try {
    const roundId = Number(req.params.roundId);

    const data = await service.getAssignmentsByRound(roundId);

    const formatted = data.map(a => ({
      id: a.id,
      staffId: a.staff_id,
      courseId: a.course_id,
      assignedHours: a.assigned_hours,
      status: a.status,
      staffName: a.staff_name,
      courseName: a.course_name
    }));

    res.json(formatted);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async getConflictsByRound(req, res) {
  try {
    const roundId = Number(req.params.roundId);

    const data = await service.getConflictsByRound(roundId);

    const formatted = data.map(c => ({
      id: c.id,
      courseId: c.course_id,
      courseName: c.course_name,
      status: c.status,
      preferenceLevel: c.preference_level,
      involvedStaffNames: c.involved_staff_names,
      chosenStaffName: c.chosen_staff_name || "",
      chosenStaffId: c.chosen_staff_id || 0,
      resolutionMethod: c.resolution_method,
    }));

    res.json({ conflicts: formatted });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async getAppealsByRound(req, res) {
  try {
    const roundId = Number(req.params.roundId);

    const data = await service.getAppealsByRound(roundId);

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

}
module.exports = new AssignmentHttpController();
