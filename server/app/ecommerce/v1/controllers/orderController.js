const OrderModel = require("../models/orderModel");
const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const {cancelShipment}=require('../../../../services/ExpressBees/xpressbees_service')

// Helper functions
const statusLabelMap = {
  booked: "Shipment Booked",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  rto: "Returned to Origin",
  ndr: "Delivery Attempt Failed",
  cancelled: "Cancelled",
  pending: "Preparing Shipment",
};

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
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const userId = req.user.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const orderId = Number(req.params.orderId);
      const { reason_id, comment } = req.body;

      if (!reason_id) {
        return res.status(400).json({
          success: false,
          message: "Cancellation reason is required",
        });
      }

      // 1 Check order ownership & status
      const [[order]] = await conn.execute(
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
      await conn.execute(
        `
        INSERT INTO order_cancellation_requests
          (order_id, user_id, reason_id, comment)
        VALUES (?, ?, ?, ?)
        `,
        [orderId, userId, reason_id, comment || null],
      );

      //2.5 create Cancellation Timeline
      await conn.execute(
        `
       INSERT INTO order_cancellation_timeline (order_id, event)
        VALUES (?, 'cancellation_requested')
        `,
        [orderId],
      );

      // 3 Update order status
      await conn.execute(
        `
        UPDATE eorders
        SET cancellation_status = 'requested'
        WHERE order_id = ?
        `,
        [orderId],
      );

      await conn.commit();

      return res.json({
        success: true,
        message: "Cancellation request submitted successfully",
      });
    } catch (error) {
      await conn.rollback();
      console.error("Cancellation request error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to submit cancellation request",
      });
    } finally {
      await conn.release();
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

  // Track Order status
  async getTracking(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1;

      // if (!userId) {
      //   return res.status(401).json({
      //     success: false,
      //     message: "Unauthorized user",
      //   });
      // }

      const { orderId } = req.params;

      const [orders] = await db.query(
        `SELECT order_id
       FROM eorders
       WHERE order_id = ?
         AND user_id = ?
       LIMIT 1`,
        [orderId, userId],
      );

      if (!orders.length) {
        return res.status(404).json({ message: "Order not found" });
      }

      const [shipments] = await db.query(
        `SELECT
         vendor_id,
         courier_name,
         awb_number,
         shipping_status,
         label_url,
         manifest_url
       FROM order_shipments
       WHERE order_id = ?`,
        [orderId],
      );

      //  Add label to each shipment
      const formattedShipments = shipments.map((shipment) => ({
        ...shipment,
        status_label:
          statusLabelMap[shipment.shipping_status] || shipment.shipping_status,
      }));

      return res.json({
        order_id: orderId,
        shipments: formattedShipments,
      });
    } catch (err) {
      console.error("Tracking API error:", err);
      res.status(500).json({ message: "Tracking fetch failed" });
    }
  }

  // Shipment cancellation
  async cancelShipmentHandler(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1;

      // if (!userId) {
      //   return res.status(401).json({
      //     success: false,
      //     message: "Unauthorized user",
      //   });
      // }

      const { shipmentId } = req.params;

      // Authorization check
      const [rows] = await db.query(
        `SELECT os.order_id, o.user_id
       FROM order_shipments os
       JOIN eorders o ON os.order_id = o.order_id
       WHERE os.id = ?
         AND o.user_id = ?
       LIMIT 1`,
        [shipmentId, userId],
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const { order_id } = rows[0];

      // Cancel
      await cancelShipment(shipmentId);

      return res.json({
        success: true,
        message: "Shipment cancelled successfully",
        order_id,
      });
    } catch (err) {
      console.error("Cancel shipment error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new OrderController();
