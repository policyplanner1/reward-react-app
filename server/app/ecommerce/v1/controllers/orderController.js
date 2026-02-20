const OrderModel = require("../models/orderModel");
const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class OrderController {
  // Get order history
  async getOrderHistory(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const orderId = req.query.order_id ? Number(req.query.order_id) : null;

      const status = req.query.status || null;
      const fromDate = req.query.from_date || null;
      const toDate = req.query.to_date || null;

      const { orders, total } = await OrderModel.getOrderHistory({
        userId,
        orderId,
        status,
        fromDate,
        toDate,
        page,
        limit,
      });

      return res.json({
        success: true,
        orders,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    } catch (error) {
      console.error("Order history error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch order history",
      });
    }
  }

  //   Get order details
  async getOrderDetails(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }
      const orderId = Number(req.params.orderId);

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Invalid order id",
        });
      }

      const data = await OrderModel.getOrderDetails({
        userId,
        orderId,
      });

      return res.json({
        success: true,
        ...data,
      });
    } catch (error) {
      console.error("Order details error:", error);

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

  // Cancellation Reason
  async getCancellationReasons(req, res) {
    const [rows] = await db.execute(
      `
    SELECT reason_id, reason_text
    FROM order_cancellation_reasons
    WHERE is_active = 1
    ORDER BY sort_order ASC
    `,
    );

    res.json({ success: true, reasons: rows });
  }

  // Cancellation Request
  async requestOrderCancellation(req, res) {
    try {
      // const userId = req.user.user_id;
      const userId = 1;
      const orderId = Number(req.params.orderId);
      const { reason_id, comment } = req.body;

      if (!reason_id) {
        return res.status(400).json({
          success: false,
          message: "Cancellation reason is required",
        });
      }

      // 1 Check order ownership & status
      const [[order]] = await db.execute(
        `
        SELECT order_id, order_ref,status, cancellation_status
        FROM eorders
        WHERE order_id = ? AND user_id = ?
        `,
        [orderId, userId],
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (order.cancellation_status !== "none") {
        return res.status(400).json({
          success: false,
          message: "Cancellation already requested",
        });
      }

      if (["shipped", "delivered"].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: "Order cannot be cancelled at this stage",
        });
      }

      // 2 Create cancellation request
      await db.execute(
        `
        INSERT INTO order_cancellation_requests
          (order_id, user_id, reason_id, comment)
        VALUES (?, ?, ?, ?)
        `,
        [orderId, userId, reason_id, comment || null],
      );

      //2.5 create Cancellation Timeline
      await db.execute(
        `
       INSERT INTO order_cancellation_timeline (order_id, event)
        VALUES (?, 'cancellation_requested')
        `,
        [orderId],
      );

      // 3 Update order status
      await db.execute(
        `
        UPDATE eorders
        SET cancellation_status = 'requested'
        WHERE order_id = ?
        `,
        [orderId],
      );

      return res.json({
        success: true,
        message: "Cancellation request submitted successfully",
      });
    } catch (error) {
      console.error("Cancellation request error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to submit cancellation request",
      });
    }
  }

  // Cancellation Details
  async cancellationDetails(req, res) {
    try {
      // const userId = req.user.user_id;
      const userId = 1;
      const orderId = Number(req.params.orderId);

      const data = await OrderModel.getCancellationDetails({
        userId,
        orderId,
      });

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Cancellation details error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch cancellation details",
      });
    }
  }
}

module.exports = new OrderController();
