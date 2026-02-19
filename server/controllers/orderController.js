const orderModel = require("../models/orderModel");
const db = require("../config/database");

class OrderController {
  async getOrderList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const filters = {
        orderId: req.query.order_id ? Number(req.query.order_id) : null,
        orderRef: req.query.order_ref || null,
        status: req.query.status || null,
        userId: req.query.user_id ? Number(req.query.user_id) : null,
        companyId: req.query.company_id ? Number(req.query.company_id) : null,
        fromDate: req.query.from_date || null,
        toDate: req.query.to_date || null,
        page,
        limit,
      };

      const { orders, total } = await orderModel.getAdminOrderHistory(filters);

      return res.json({
        success: true,
        orders,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    } catch (error) {
      console.error("Admin order history error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch admin order history",
      });
    }
  }

  // order Details
  async getAdminOrderDetails(req, res) {
    try {
      const orderId = Number(req.params.orderId);

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Invalid order id",
        });
      }

      const data = await orderModel.getAdminOrderDetails(orderId);

      return res.json({
        success: true,
        ...data,
      });
    } catch (error) {
      console.error("Admin order details error:", error);

      if (error.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to fetch order details",
      });
    }
  }

  // create shipment
  async createShipment(req, res) {}
}

module.exports = new OrderController();
