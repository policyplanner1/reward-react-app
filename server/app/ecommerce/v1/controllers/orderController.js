const OrderModel = require("../models/orderModel");
const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const NotificationModel = require("../models/notificationModel");
const {
  generateInvoicePDF,
} = require("../../../../services/Invoice/pdf-service");

//Helper function For invoice
function buildInvoiceHTML(invoice, items) {
  const template = fs.readFileSync(
    path.join(__dirname, "../../../../templates/invoice2.html"),
    "utf8",
  );

  // Build product rows
  const rows = items
    .map(
      (item) => `
      <tr>
      <td>
        <div style="font-weight:600;">${item.product_name}</div>
        <div style="font-size:11px;color:#64748b;">
          SKU: ${item.sku} • GST ${item.tax_rate}%
        </div>
      </td>

      <td style="text-align:center">${item.quantity}</td>

      <td style="text-align:right">
      ${Number(item.unit_price).toFixed(2)}
      </td>

      <td style="text-align:right;font-weight:600">
      ${Number(item.line_total).toFixed(2)}
      </td>

      </tr>
      `,
    )
    .join("");

  let html = template;

  // Replace placeholders (global)
  html = html.replace(/{{invoice_number}}/g, invoice.invoice_number);
  html = html.replace(
    /{{invoice_date}}/g,
    new Date(invoice.invoice_date).toLocaleDateString(),
  );

  html = html.replace(/{{order_ref}}/g, invoice.order_ref);
  html = html.replace(
    /{{order_date}}/g,
    new Date(invoice.order_date).toLocaleDateString(),
  );

  html = html.replace(/{{vendor_name}}/g, invoice.company_name || "");
  html = html.replace(/{{vendor_gstin}}/g, invoice.gstin || "");

  html = html.replace(
    /{{vendor_address}}/g,
    `
    ${invoice.line1 || ""} ${invoice.line2 || ""}<br>
    ${invoice.city || ""}, ${invoice.state_name || ""} ${invoice.pincode || ""}
  `,
  );

  html = html.replace(/{{customer_name}}/g, invoice.contact_name || "");
  html = html.replace(
    /{{customer_address}}/g,
    `
    ${invoice.address1 || ""} ${invoice.address2 || ""}<br>
    ${invoice.customer_city || ""} ${invoice.zipcode || ""}
  `,
  );

  html = html.replace(/{{items}}/g, rows);

  html = html.replace(/{{subtotal}}/g, Number(invoice.subtotal).toFixed(2));
  html = html.replace(/{{tax_total}}/g, Number(invoice.tax_total).toFixed(2));
  html = html.replace(
    /{{shipping_amount}}/g,
    Number(invoice.shipping_amount).toFixed(2),
  );
  html = html.replace(
    /{{grand_total}}/g,
    Number(invoice.grand_total).toFixed(2),
  );

  return html;
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

      // 1 Get invoices for this order
      const [invoiceRows] = await db.query(
        `
      SELECT invoice_id
      FROM invoices
      WHERE order_id = ?
      `,
        [orderId],
      );

      if (!invoiceRows.length) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // For now return first invoice
      // (later you can loop and zip multiple PDFs)
      const invoiceId = invoiceRows[0].invoice_id;

      // 2 Fetch invoice data
      const invoice = await OrderModel.getInvoiceData(invoiceId);

      // 3 Fetch invoice items
      const items = await OrderModel.getInvoiceItems(invoiceId);

      // 4 Build HTML
      const html = buildInvoiceHTML(invoice, items);

      // 5 Generate PDF
      const pdf = await generateInvoicePDF(html);

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${invoice.invoice_number}.pdf`,
      });

      return res.send(pdf);
    } catch (error) {
      console.error("Invoice PDF Error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to generate invoice",
      });
    }
  }
}

module.exports = new OrderController();
