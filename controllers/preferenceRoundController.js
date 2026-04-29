const service = require("../services/preferenceRoundService");

class PreferenceRoundController {
  async openRound(call, callback) {
    try {
const { startAt, endAt, userId, conflictResolutionMode, semester } = call.request;
const result = await service.openRound(
  startAt,
  endAt,
  userId,
  conflictResolutionMode,
  semester
);
      callback(null, result);
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async lockRound(call, callback) {
    try {
      const { userId } = call.request;
      const result = await service.lockRound(userId);
      callback(null, result);
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async getCurrentRound(call, callback) {
    try {
      const round = await service.getCurrentRound();

      if (!round) {
return callback(null, {
  id: 0,
  startAt: "",
  endAt: "",
  isLocked: false,
  conflictResolutionMode: "",
  semester: ""
});
      }

callback(null, {
  id: Number(round.id),
  startAt: round.start_at ? new Date(round.start_at).toISOString() : "",
  endAt: round.end_at ? new Date(round.end_at).toISOString() : "",
  isLocked: Boolean(round.is_locked),
  conflictResolutionMode: round.conflict_resolution_mode || "",
  semester: round.semester || ""
});
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }

  async getSubmissionStatus(call, callback) {
    try {
      const data = await service.getSubmissionStatus(call.request.roundId);

      const formatted = data.map(t => ({
        id: Number(t.id),
        staffId: Number(t.staff_id),
        staffName: t.staff_name || "",
        staffEmail: t.staff_email || "",
        status: t.status || "",
        isValid: Boolean(t.is_valid),
        submittedAt: t.submitted_at ? new Date(t.submitted_at).toISOString() : ""
      }));

      callback(null, { tracking: formatted });
    } catch (error) {
      callback({ code: 500, message: error.message });
    }
  }
}

module.exports = new PreferenceRoundController();