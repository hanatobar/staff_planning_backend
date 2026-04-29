const repository = require("../repositories/courseRequirementRepository");

class CourseRequirementService {

  async addRequirement(course_id, required_hours) {

    if (!course_id || !required_hours) {
      throw new Error("Missing required fields");
    }

    return await repository.addRequirement(
      course_id,
      required_hours
    );
  }

  async updateRequirement(id, hours){

  if (!id) {
    throw new Error("Requirement ID is required");
  }

  if (!hours) {
    throw new Error("Fields cannot be empty");
  }

  return await repository.updateRequirement(id, hours);
}

  async getAllRequirements() {
    return await repository.getAllRequirements();
  }

  async getRequirementsBySemester(semester) {
  if (!semester || !semester.trim()) {
    throw new Error("Semester is required");
  }

  return await repository.getRequirementsBySemester(semester.trim());
}

}

module.exports = new CourseRequirementService();