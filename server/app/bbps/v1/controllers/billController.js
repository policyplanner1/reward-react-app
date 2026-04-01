const crypto = require("crypto");
const ekoService = require("../services/eko_service");
const db = require("../../../../config/database");

class BillController {
  async getCategories(req, res) {
    try {
      const data = await ekoService.getCategories();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async getOperators(req, res) {
    try {
      const data = await ekoService.getOperators(req.query.category);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async getOperatorDetails(req, res) {
    try {
      const data = await ekoService.getOperatorDetails(req.params.id);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async fetchBill(req, res) {
    try {
      const data = await ekoService.fetchBill(req.body);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = new BillController();
