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
      const result = await service.generatePlan();
      res.json(result);
    } catch (err) {
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

    res.json(data);

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

    res.json(data || []); // ✅ always return array

  } catch (err) {
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
    const { appealId, response } = req.body;

    const result = await service.reviewAppeal(appealId, response);

    res.json(result); // ✅ MUST return JSON

  } catch (err) {
    console.error("REVIEW ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}

async resolveAppeal(req, res) {
  try {
    const { appealId, status } = req.body;

    const result = await service.resolveAppeal(appealId, status);

    res.json(result); // ✅ MUST return JSON

  } catch (err) {
    console.error("RESOLVE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
}

async getNonSubmitters(req, res) {
  try {
    const data = await service.getNonSubmitters();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

}
module.exports = new AssignmentHttpController();