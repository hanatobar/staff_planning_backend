const preferenceService = require("../services/preferenceService");

class PreferenceController {
  async addPreference(call, callback) {
    try {
      const staff_id = call.request.staffId;
      const course_id = call.request.courseId;
      const preference_level = call.request.preferenceLevel;

      const result = await preferenceService.addPreference(
        staff_id,
        course_id,
        preference_level
      );

      callback(null, {
        message: result.message
      });
    } catch (error) {
      callback({
        code: 500,
        message: error.message
      });
    }
  }

  async getPreferencesByStaff(call, callback) {
    try {
      const staffId = call.request.staffId;
      const preferences = await preferenceService.getPreferencesByStaff(staffId);

      const formatted = preferences.map(p => ({
        id: Number(p.id),
        staffId: Number(p.staff_id),
        courseId: Number(p.course_id),
        preferenceLevel: Number(p.preference_level),
        staffName: p.staff_name || "",
        courseName: p.course_name || ""
      }));

      callback(null, { preferences: formatted });
    } catch (error) {
      callback({
        code: 500,
        message: error.message
      });
    }
  }

  async updatePreference(call, callback) {
    try {
      const { id, preferenceLevel } = call.request;

      const result = await preferenceService.updatePreference(id, preferenceLevel);

      callback(null, {
        message: result.message
      });
    } catch (error) {
      callback({
        code: 500,
        message: error.message
      });
    }
  }

  async getAllPreferences(call, callback) {
    try {
      const preferences = await preferenceService.getAllPreferences();

      const formatted = preferences.map(p => ({
        id: Number(p.id),
        staffId: Number(p.staff_id),
        courseId: Number(p.course_id),
        preferenceLevel: Number(p.preference_level),
        staffName: p.staff_name,
        courseName: p.course_name
      }));
      console.log("CONTROLLER getAllPreferences called");
      callback(null, {
        preferences: formatted
      });
    } catch (error) {
      console.error("Error in getAllPreferences:", error);

      callback({
        code: 500,
        message: error.message
      });
    }
  }

  async resetPreferences(call, callback) {
    try {
      const staffId = call.request.staffId;
      const result = await preferenceService.resetPreferences(staffId);

      callback(null, {
        message: result.message
      });
    } catch (error) {
      callback({
        code: 500,
        message: error.message
      });
    }
  }
}

module.exports = new PreferenceController();