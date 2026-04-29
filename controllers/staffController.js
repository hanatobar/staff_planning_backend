const staffService = require('../services/staffService');

async function addStaff(call, callback) {
  try {
    const { name, email, role, maxWorkload, priorityRank } = call.request;

    const result = await staffService.addStaff(
      name,
      email,
      role,
      maxWorkload,
      priorityRank
    );

    callback(null, { message: result.message });
  } catch (error) {
    console.error(error);
    callback(error, null);
  }
}

async function getAllStaff(call, callback) {
  try {
    const staff = await staffService.getAllStaff();

    const formattedStaff = staff.map(s => ({
      id: Number(s.id),
      name: s.name || "",
      email: s.email || "",
      role: s.role || "",
      maxWorkload: Number(s.max_workload || 0),
      userId: Number(s.user_id || 0),
      priorityRank: Number(s.priority_rank || 0),
    }));

    callback(null, { staff: formattedStaff });
  } catch (error) {
    callback(error, null);
  }
}

async function deleteStaff(call, callback) {
  try {
    await staffService.deleteStaff(call.request.id);
    callback(null, { message: "Staff deleted successfully" });
  } catch (error) {
    callback(error, null);
  }
}

async function updateStaff(call, callback) {
  try {
    const { id, name, email, role, maxWorkload, priorityRank } = call.request;

    const result = await staffService.updateStaff(
      id,
      name,
      email,
      role,
      maxWorkload,
      priorityRank
    );

    callback(null, { message: result.message });
  } catch (error) {
    console.error(error);
    callback(error, null);
  }
}

async function updateTaPriorityOrder(call, callback) {
  try {
    const staffIds = call.request.staffIds;
    const result = await staffService.updateTaPriorityOrder(staffIds);
    callback(null, { message: result.message });
  } catch (error) {
    console.error(error);
    callback(error, null);
  }
}

module.exports = {
  addStaff,
  getAllStaff,
  deleteStaff,
  updateStaff,
  updateTaPriorityOrder
};