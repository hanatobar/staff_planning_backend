const service = require("../services/courseRequirementService");

class CourseRequirementHttpController {

  async addRequirement(req, res) {
    try {
      const { courseId, requiredHours } = req.body;

      const result = await service.addRequirement(courseId, requiredHours);

      res.json({ message: result.message || "Requirement added successfully" });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateRequirement(req, res) {
    try {
      const id = Number(req.params.id);
      const { requiredHours } = req.body;

      await service.updateRequirement(id, requiredHours);

      res.json({ message: "Updated successfully" });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAllRequirements(req, res) {
    try {
      const data = await service.getAllRequirements();

      const formatted = data.map(r => ({
        id: r.id,
        courseId: r.course_id,
        requiredHours: r.required_hours,
        courseName: r.course_name
      }));

      res.json({ requirements: formatted });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

}

module.exports = new CourseRequirementHttpController();