const service = require("../services/staffService");

class StaffHttpController {

  async addStaff(req, res) {
    try {
      const { name, email, role, maxWorkload, priorityRank } = req.body;

      const result = await service.addStaff(
        name,
        email,
        role,
        maxWorkload,
        priorityRank
      );

      res.json({ message: result?.message || "Staff added successfully" });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getAllStaff(req, res) {
    try {
      const data = await service.getAllStaff();

      const formatted = data.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        maxWorkload: s.max_workload,
        userId: s.user_id,
        priorityRank: s.priority_rank
      }));

      res.json({ staff: formatted });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async deleteStaff(req, res) {
    try {
      const id = Number(req.params.id);

      const result = await service.deleteStaff(id);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateStaff(req, res) {
    try {
      const id = Number(req.params.id);
      const { name, email, role, maxWorkload, priorityRank } = req.body;

      const result = await service.updateStaff(
        id,
        name,
        email,
        role,
        maxWorkload,
        priorityRank
      );

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

async updateTaPriorityOrder(req, res) {
  try {
    const { staffIds } = req.body;

    // 🔥 1. Validate structure
    if (!Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({
        error: "staffIds must be a non-empty array",
      });
    }

    const cleanIds = [];

    for (let i = 0; i < staffIds.length; i++) {
      const rawId = staffIds[i];

      console.log(`RAW ID[${i}]:`, rawId, "| TYPE:", typeof rawId);

      // 🔥 2. Block null/undefined early
      if (rawId === null || rawId === undefined) {
        return res.status(400).json({
          error: `ID is null/undefined at index ${i}`,
        });
      }

      // 🔥 3. Convert safely
      const parsed = Number(rawId);

      // 🔥 4. STRICT validation (this is key)
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return res.status(400).json({
          error: `Invalid ID at index ${i}: ${rawId}`,
        });
      }

      cleanIds.push(parsed);
    }

    console.log("✅ FINAL CLEAN IDS:", cleanIds);

    // 🔥 5. Call service with CLEAN data only
    const result = await service.updateTaPriorityOrder(cleanIds);

    return res.json(result);

  } catch (err) {
    console.error("❌ CONTROLLER ERROR:", err);

    // 🔥 IMPORTANT: return REAL error
    return res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
}

}

module.exports = new StaffHttpController();
