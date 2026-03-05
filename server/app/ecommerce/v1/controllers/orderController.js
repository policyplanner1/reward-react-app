const OrderModel = require("../models/orderModel");
const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const NotificationModel = require("../models/notificationModel");

//Helper function For invoice
async function getInvoiceData(invoiceId) {
  const [rows] = await db.query(
    `
    SELECT
      i.invoice_id,
      i.invoice_number,
      i.subtotal,
      i.tax_total,
      i.shipping_amount,
      i.grand_total,
      i.invoice_date,

      o.order_ref,
      o.created_at AS order_date,

      v.vendor_id,
      v.company_name,
      v.gstin,

      va.line1,
      va.line2,
      va.city,
      va.pincode,
      s.state_name,

      ca.contact_name,
      ca.address1,
      ca.address2,
      ca.city AS customer_city,
      ca.zipcode

    FROM invoices i
    JOIN eorders o ON o.order_id = i.order_id

    JOIN vendors v ON v.vendor_id = i.vendor_id
    JOIN vendor_addresses va 
      ON va.vendor_id = v.vendor_id AND va.type='shipping'
    JOIN states s ON s.state_id = va.state_id

    JOIN customer_addresses ca ON ca.address_id = o.address_id

    WHERE i.invoice_id = ?
    LIMIT 1
    `,
    [invoiceId],
  );

  return rows[0];
}

// Invoice Items
async function getInvoiceItems(invoiceId) {
  const [items] = await db.query(
    `
    SELECT
      product_name,
      sku,
      quantity,
      unit_price,
      tax_rate,
      cgst_amount,
      sgst_amount,
      igst_amount,
      line_total
    FROM invoice_items
    WHERE invoice_id = ?
    `,
    [invoiceId],
  );

  return items;
}

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

      await NotificationModel.create({
        userId,
        type: "order",
        title: "Order Cancelled ❌📦",
        message: "Your order was cancelled as requested.",
        reference_type: "order",
        reference_id: orderId,
      });

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

  // ====================================================Invoice=================================================
  async getInvoice(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.user_id;

      // 1 Verify order belongs to user
      const [[order]] = await db.query(
        `
      SELECT order_id
      FROM eorders
      WHERE order_id = ? AND user_id = ?
      LIMIT 1
      `,
        [orderId, userId],
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // 2 Fetch invoices
      const [invoices] = await db.query(
        `
      SELECT
        i.invoice_id,
        i.invoice_number,
        i.vendor_id,
        i.subtotal,
        i.tax_total,
        i.shipping_amount,
        i.grand_total,
        i.invoice_date,

        v.company_name,
        v.gstin
      FROM invoices i
      JOIN vendors v ON v.vendor_id = i.vendor_id
      WHERE i.order_id = ?
      `,
        [orderId],
      );

      if (!invoices.length) {
        return res.json({
          success: true,
          invoices: [],
        });
      }

      const invoiceIds = invoices.map((i) => i.invoice_id);

      // 3 Fetch invoice items
      const [items] = await db.query(
        `
      SELECT
        invoice_id,
        product_name,
        sku,
        quantity,
        unit_price,
        tax_rate,
        cgst_amount,
        sgst_amount,
        igst_amount,
        line_total
      FROM invoice_items
      WHERE invoice_id IN (?)
      `,
        [invoiceIds],
      );

      // 4 Group items by invoice
      const itemMap = {};

      for (const item of items) {
        if (!itemMap[item.invoice_id]) {
          itemMap[item.invoice_id] = [];
        }

        itemMap[item.invoice_id].push(item);
      }

      // 5 Attach items to invoices
      const result = invoices.map((inv) => ({
        ...inv,
        items: itemMap[inv.invoice_id] || [],
      }));

      return res.json({
        success: true,
        order_id: orderId,
        invoices: result,
      });
    } catch (error) {
      console.error("Get Invoice Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch invoice",
      });
    }
  }
}

module.exports = new OrderController();
