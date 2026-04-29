const service = require("../services/courseRequirementService");

class CourseRequirementController {

  async addRequirement(call, callback) {

    try {

      const { courseId, requiredHours } = call.request;

      const result = await service.addRequirement(
        courseId,
        requiredHours
      );

      callback(null, {
        message: "Requirement added successfully"
      });

    } catch (error) {

      callback({
        code: 500,
        message: error.message
      });

    }

  }

  async updateRequirement(call, callback){

  const { id, requiredHours } = call.request;

  await service.updateRequirement(id, requiredHours);

  callback(null, { message: "Updated successfully" });

}

  async getAllRequirements(call, callback) {

    try {

      const data = await service.getAllRequirements();

      const formatted = data.map(r => ({
        id: r.id,
        courseId: r.course_id,
        requiredHours: r.required_hours,
        courseName: r.course_name
      }));

      callback(null, {
        requirements: formatted
      });

    } catch (error) {

      callback({
        code: 500,
        message: error.message
      });

    }

  }

}

module.exports = new CourseRequirementController();