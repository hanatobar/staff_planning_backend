const service = require("../services/courseService");

class CourseHttpController {

  async addCourse(req, res) {
    try {
      const { name, code, hours, semester } = req.body;

      const result = await service.addCourse(
        name,
        code,
        hours,
        semester
      );

      res.json({ message: result.message || "Course added successfully" });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAllCourses(req, res) {
    try {
      const data = await service.getAllCourses();

      const formatted = data.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        hours: c.hours,
        semester: c.semester
      }));

      res.json({ courses: formatted });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async deleteCourse(req, res) {
    try {
      const id = Number(req.params.id);

      const result = await service.deleteCourse(id);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateCourse(req, res) {
    try {
      const id = Number(req.params.id);
      const { name, code, hours, semester } = req.body;

      const result = await service.updateCourse(
        id,
        name,
        code,
        hours,
        semester
      );

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

}

module.exports = new CourseHttpController();