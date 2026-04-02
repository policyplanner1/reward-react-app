const ekoService = require("../services/eko_service");

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
      const { category_id } = req.query;

      const data = await ekoService.getOperators(category_id);

      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // Get Grouped operators
  async getGroupedOperators(req, res) {
    try {
      const { category, search } = req.query;

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category is required",
        });
      }

      const data = await ekoService.getOperatorsGrouped(category, search);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Error in getGroupedOperators:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch grouped operators",
        error: error.message,
      });
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
      const data = await ekoService.fetchBill(req.body, req);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = new BillController();
