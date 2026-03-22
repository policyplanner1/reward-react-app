const db = require("../config/database");
const xpressService = require("../services/ExpressBees/xpressbees_service");

class LogisticsController {
  // Resolve NDR
  async resolveNdr(req, res) {
    try {
      const { shipmentId } = req.params;
      const { action, new_address_id, notes } = req.body;
      // {
      //   "action": "retry",
      //   "new_address_id": 12,
      //   "notes": "Customer confirmed availability"
      // }

      await xpressService.resolveNDR({
        shipmentId,
        action,
        new_address_id,
        notes,
      });

      return res.json({
        success: true,
        message: "NDR resolved successfully",
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Logistics dashboard summary
}

module.exports = new LogisticsController();
