const { status } = require("@grpc/grpc-js");
const service = require("../services/assignmentService");

class AssignmentController {

 async generatePlan(call, callback) {
  try {
    const result = await service.generatePlan();
    callback(null, { message: result.message });
  } catch (error) {
    callback({
      code: 500,
      message: error.message
    });
  }
}

  async getAssignments(call, callback){

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

      callback(null, { assignments: formatted });

    } catch (error) {

      callback({
        code: 500,
        message: error.message
      });

    }

  }

  async getAnalytics(call, callback) {

  try {

    const data = await service.getAnalytics();

    callback(null, data);

  } catch (error) {

    callback({
      code: 500,
      message: error.message
    });

  }
}



async getAssignmentsByStaff(call, callback) {
  try {
    const data = await service.getAssignmentsByStaff(call.request.staffId);

    const formatted = data.map(a => ({
      id: a.id,
      staffId: a.staff_id,
      courseId: a.course_id,
      assignedHours: a.assigned_hours,
      status: a.status,
      staffName: a.staff_name,
      courseName: a.course_name
    }));

    callback(null, { assignments: formatted });

  } catch (error) {
    callback({
      code: 500,
      message: error.message
    });
  }
}



async approvePlan(call, callback) {
  try {
    const result = await service.approvePlan();
    callback(null, result);
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async getConflicts(call, callback) {
  try {
    const data = await service.getConflicts();

    const formatted = data.map(c => ({
      id: c.id,
      courseId: c.course_id,
      courseName: c.course_name,
      preferenceLevel: c.preference_level,
      chosenStaffId: c.chosen_staff_id || 0,
      chosenStaffName: c.chosen_staff_name || "",
      resolutionMethod: c.resolution_method,
      status: c.status,
      involvedStaffNames: c.involved_staff_names || ""
    }));

    callback(null, { conflicts: formatted });
  } catch (error) {
    callback({
      code: 500,
      message: error.message
    });
  }
}
async getNonSubmitters(call, callback) {
  try {
    const data = await service.getNonSubmitters();

    const formatted = data.map(s => ({
      staffId: Number(s.staff_id),
      staffName: s.staff_name,
      staffEmail: s.staff_email
    }));

    callback(null, { staff: formatted });
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async getUncoveredHours(call, callback) {
  try {
    const data = await service.getUncoveredHours();

    const formatted = data.map(c => ({
      courseId: Number(c.course_id),
      courseName: c.course_name,
      requiredHours: Number(c.required_hours),
      assignedHours: Number(c.assigned_hours),
      uncoveredHours: Number(c.uncovered_hours)
    }));

    callback(null, { items: formatted });
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async assignUncoveredHours(call, callback) {
  try {
    const { targetStaffId, courseId, hours } = call.request;
    const result = await service.assignUncoveredHours(targetStaffId, courseId, hours);
    callback(null, result);
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async transferAssignmentHours(call, callback) {
  try {
    const { sourceAssignmentId, targetStaffId, hours } = call.request;
    const result = await service.transferAssignmentHours(sourceAssignmentId, targetStaffId, hours);
    callback(null, result);
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async submitAppeal(call, callback) {
  try {
    const { assignmentId, staffId, appealedHours, reason } = call.request;
    const result = await service.submitAppeal(
      assignmentId,
      staffId,
      appealedHours,
      reason
    );
    callback(null, result);
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async getAppealsByStaff(call, callback) {
  try {
    const data = await service.getAppealsByStaff(call.request.staffId);

    const formatted = data.map(a => ({
      id: Number(a.id),
      assignmentId: Number(a.assignment_id),
      staffId: Number(a.staff_id),
      roundId: Number(a.round_id),
      appealedHours: Number(a.appealed_hours),
      reason: a.reason || "",
      status: a.status || "",
      coordinatorResponse: a.coordinator_response || "",
      reviewedByUserId: Number(a.reviewed_by_user_id || 0),
      createdAt: a.created_at ? new Date(a.created_at).toISOString() : "",
      reviewedAt: a.reviewed_at ? new Date(a.reviewed_at).toISOString() : "",
      staffName: a.staff_name || "",
      courseName: a.course_name || "",
    }));

    callback(null, { appeals: formatted });
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async getAllAppeals(call, callback) {
  try {
    const data = await service.getAllAppeals();

    const formatted = data.map(a => ({
      id: Number(a.id),
      assignmentId: Number(a.assignment_id),
      staffId: Number(a.staff_id),
      roundId: Number(a.round_id),
      appealedHours: Number(a.appealed_hours),
      reason: a.reason || "",
      status: a.status || "",
      coordinatorResponse: a.coordinator_response || "",
      reviewedByUserId: Number(a.reviewed_by_user_id || 0),
      createdAt: a.created_at ? new Date(a.created_at).toISOString() : "",
      reviewedAt: a.reviewed_at ? new Date(a.reviewed_at).toISOString() : "",
      staffName: a.staff_name || "",
      courseName: a.course_name || "",
    }));

    callback(null, { appeals: formatted });
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async reviewAppeal(call, callback) {
  try {
    const { appealId, status, coordinatorResponse, reviewedByUserId } = call.request;
    const result = await service.reviewAppeal(
      appealId,
      status,
      coordinatorResponse,
      reviewedByUserId
    );
    callback(null, result);
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async resolveAppeal(call, callback) {
  try {
    const {
      appealId,
      reviewedByUserId,
      coordinatorResponse,
      redistributions,
      compensations
    } = call.request;

    const result = await service.resolveAppeal(
      appealId,
      reviewedByUserId,
      coordinatorResponse,
      redistributions,
      compensations
    );

    callback(null, result);
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}

async getAppealDetails(call, callback) {
  try {
    const data = await service.getAppealDetails(call.request.appealId);

    const formattedRedistributions = data.redistributions.map(r => ({
      id: Number(r.id),
      appealId: Number(r.appeal_id),
      targetStaffId: Number(r.target_staff_id),
      targetStaffName: r.target_staff_name || "",
      hours: Number(r.hours),
    }));

    const formattedCompensations = data.compensations.map(c => ({
      id: Number(c.id),
      appealId: Number(c.appeal_id),
      sourceType: c.source_type || "",
      courseId: Number(c.course_id || 0),
      courseName: c.course_name || "",
      sourceAssignmentId: Number(c.source_assignment_id || 0),
      sourceStaffId: Number(c.source_staff_id || 0),
      sourceStaffName: c.source_staff_name || "",
      hours: Number(c.hours),
    }));

    callback(null, {
      redistributions: formattedRedistributions,
      compensations: formattedCompensations,
    });
  } catch (error) {
    callback({ code: 500, message: error.message });
  }
}



}

module.exports = new AssignmentController();