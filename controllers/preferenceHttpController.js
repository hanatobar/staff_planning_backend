const service = require("../services/preferenceService");

class PreferenceHttpController {

  async addPreference(req, res) {
    try {
      const { staffId, courseId, preferenceLevel } = req.body;

      const result = await service.addPreference(
        staffId,
        courseId,
        preferenceLevel
      );

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getPreferencesByStaff(req, res) {
    try {
      const staffId = Number(req.params.staffId);

      const data = await service.getPreferencesByStaff(staffId);

      const formatted = data.map(p => ({
        id: p.id,
        staffId: p.staff_id,
        courseId: p.course_id,
        preferenceLevel: p.preference_level,
        courseName: p.course_name
      }));

      res.json({ preferences: formatted });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAllPreferences(req, res) {
    try {
      const data = await service.getAllPreferences();

      const formatted = data.map(p => ({
        id: p.id,
        staffId: p.staff_id,
        courseId: p.course_id,
        preferenceLevel: p.preference_level,
        courseName: p.course_name,
        staffName: p.staff_name
      }));

      res.json({ preferences: formatted });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async updatePreference(req, res) {
    try {
      const id = Number(req.params.id);
      const { preferenceLevel } = req.body;

      const result = await service.updatePreference(id, preferenceLevel);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async resetPreferences(req, res) {
    try {
      const staffId = Number(req.params.staffId);

      const result = await service.resetPreferences(staffId);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

}

module.exports = new PreferenceHttpController();