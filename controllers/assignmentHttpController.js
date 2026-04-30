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

      res.json({ assignments: formatted });

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

      res.json({ assignments: formatted });

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

}
module.exports = new AssignmentHttpController();