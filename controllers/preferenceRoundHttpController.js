const service = require("../services/preferenceRoundService");

class PreferenceRoundHttpController {

  async openRound(req, res) {
    try {
      const {
        startAt,
        endAt,
        userId,
        conflictResolutionMode,
        semester
      } = req.body;

      const result = await service.openRound(
        startAt,
        endAt,
        userId,
        conflictResolutionMode,
        semester
      );

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async lockRound(req, res) {
    try {
      const { userId } = req.body;

      const result = await service.lockRound(userId);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getCurrentRound(req, res) {
    try {
      const data = await service.getCurrentRound();

      const formatted = {
        id: data.id,
        startAt: data.start_at,
        endAt: data.end_at,
        isLocked: data.is_locked,
        semester: data.semester,
        conflictResolutionMode: data.conflict_resolution_mode
      };

      res.json(formatted);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getSubmissionStatus(req, res) {
    try {
      const roundId = Number(req.params.roundId);

      const data = await service.getSubmissionStatus(roundId);

      const formatted = data.map(t => ({
        staffId: t.staff_id,
        staffName: t.staff_name,
        status: t.status,
        isValid: t.is_valid
      }));

      res.json({ tracking: formatted });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

}

module.exports = new PreferenceRoundHttpController();