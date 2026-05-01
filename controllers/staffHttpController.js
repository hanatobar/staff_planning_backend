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

      res.json({ message: result.message || "Staff added successfully" });

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

      const result = await service.updateTaPriorityOrder(staffIds);

      res.json({ message: result.message });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

}

module.exports = new StaffHttpController();
