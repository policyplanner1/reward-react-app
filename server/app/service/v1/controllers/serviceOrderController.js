const ServiceOrderModel = require("../models/serviceOrderModel");
const ServiceEnquiryModel = require("../models/serviceEnquiryModel");
const ServiceOrderDocumentModel = require("../models/serviceOrderDocumentModel");
// const { UPLOAD_BASE } = require("../../../../config/path");
const fs = require("fs");
// const path = require("path");
const { uploadToR2 } = require("../../../../utils/r2upload");
const razorpay = require("../middlewares/razorpay");
const db = require("../../../../config/database");
const crypto = require("crypto");

// Utility
const ALLOWED_STATUSES = [
  "pending_payment",
  "payment_done",
  "documents_pending",
  "documents_uploaded",
  "in_progress",
  "completed",
  "cancelled",
];

// Helper function
//calculate summary utility function
function calculateSummary({ bundles = [], individual_items = [] }) {
  // 1 Individual items total
  const individual_total = individual_items.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0,
  );

  // 2 Bundle total
  const bundle_total = bundles.reduce(
    (sum, bundle) => sum + bundle.bundle_total,
    0,
  );

  // 3 Combined item total
  const item_total = individual_total + bundle_total;

  // 4 Other fields (same as before)
  const discount = 0;
  const reward_discount = 0;
  const delivery_fee = 0;
  const handling_fee = 0;

  const total =
    item_total - discount - reward_discount + delivery_fee + handling_fee;

  return {
    item_total,
    discount,
    reward_discount,
    delivery_fee,
    handling_fee,
    total,

    //  extra clarity (optional but useful)
    breakdown: {
      individual_total,
      bundle_total,
    },
  };
}

class ServiceOrderController {
  // direct order
  async createDirectOrder(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { service_id, variant_id, price } = req.body;

      if (!service_id || !price) {
        return res.status(400).json({
          success: false,
          message: "service_id and price are required",
        });
      }

      const order = await ServiceOrderModel.create({
        user_id: userId,
        service_id,
        variant_id: variant_id || null,
        enquiry_id: null,
        price,
        status: "payment_done",
      });

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // enquiry order
  async createEnquiryOrder(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { enquiryId } = req.params;

      const enquiry = await ServiceEnquiryModel.findById(enquiryId);

      if (!enquiry) {
        return res.status(404).json({
          success: false,
          message: "Enquiry not found",
        });
      }

      const order = await ServiceOrderModel.create({
        user_id: userId,
        service_id: enquiry.service_id,
        variant_id: enquiry.variant_id,
        enquiry_id: enquiry.id,
        price: 0,
        status: "documents_pending",
      });

      res.json({
        success: true,
        message: "Order created from enquiry",
        data: order,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // create razorpay order
  async createPaymentOrder(req, res) {
    try {
      const { parent_order_id } = req.body;

      if (!parent_order_id) {
        return res.status(400).json({
          success: false,
          message: "parent_order_id required",
        });
      }

      //  Get total amount from DB
      const [orders] = await db.execute(
        `SELECT SUM(price) as total 
       FROM service_orders 
       WHERE parent_order_id = ?`,
        [parent_order_id],
      );

      const totalAmount = Number(orders[0]?.total);

      if (!totalAmount) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent_order_id",
        });
      }

      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: parent_order_id,
        notes: {
          module: "service",
          parent_order_id,
        },
      });

      await db.execute(
        `INSERT INTO razorpay_orders
      (razorpay_order_id, receipt, amount, status, parent_order_id, module)
      VALUES (?, ?, ?, 'created', ?, 'service')`,
        [razorpayOrder.id, parent_order_id, totalAmount, parent_order_id],
      );

      res.json({
        success: true,
        data: {
          key: process.env.RAZOR_API_KEY,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          parent_order_id,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // verify payment
  async verifyPayment(req, res) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      // verify signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: "Payment verification failed",
        });
      }

      //  GET parent_order_id FROM DB
      const [[rpOrder]] = await db.execute(
        `SELECT parent_order_id FROM razorpay_orders 
       WHERE razorpay_order_id = ?`,
        [razorpay_order_id],
      );

      if (!rpOrder) {
        return res.status(400).json({
          success: false,
          message: "Invalid razorpay order",
        });
      }

      const parent_order_id = rpOrder.parent_order_id;

      //  TRANSACTION
      await db.beginTransaction();

      try {
        // update service orders
        await db.execute(
          `UPDATE service_orders 
         SET status = 'documents_pending',
             payment_id = ?,
             payment_status = 'paid'
         WHERE parent_order_id = ?
         AND payment_status != 'paid'`,
          [razorpay_payment_id, parent_order_id],
        );

        // update razorpay_orders
        await db.execute(
          `UPDATE razorpay_orders
         SET razorpay_payment_id = ?,
             status = 'success',
             raw_response = ?
         WHERE razorpay_order_id = ?`,
          [razorpay_payment_id, JSON.stringify(req.body), razorpay_order_id],
        );

        await db.commit();
      } catch (err) {
        await db.rollback();
        throw err;
      }

      // redirect
      const [[firstOrder]] = await db.execute(
        `SELECT id FROM service_orders 
       WHERE parent_order_id = ? 
       ORDER BY id ASC LIMIT 1`,
        [parent_order_id],
      );

      res.json({
        success: true,
        message: "Payment successful",
        data: {
          redirect_to: `/service-order-documents/documents/${firstOrder.id}`,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // get all orders of a user
  async getMyOrders(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { status } = req.query;

      const orders = await ServiceOrderModel.getUserOrders(userId, status);

      res.json({
        success: true,
        data: orders,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // order details
  async getOrderDetails(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { id } = req.params;

      const order = await ServiceOrderModel.getOrderById(id, userId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // documents
      const documents = await ServiceOrderDocumentModel.getRequiredDocs(id);

      // timeline (UI stepper)
      const timeline = [
        {
          status: "Order Confirmed",
          completed: true,
        },
        {
          status: "Order in Progress",
          completed: ["in_progress", "completed"].includes(order.status),
        },
        {
          status: "Order Delivered",
          completed: order.status === "completed",
        },
      ];

      res.json({
        success: true,
        data: {
          order,
          documents,
          timeline,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // upload user documents for an order
  async uploadDocument(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { orderId } = req.params;
      const { document_id } = req.body;

      if (!document_id) {
        return res.status(400).json({
          success: false,
          message: "document_id required",
        });
      }

      const order = await ServiceOrderModel.getOrderById(orderId, userId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File required",
        });
      }

      //  Read file buffer
      const fileBuffer = fs.readFileSync(req.file.path);

      //  Extract extension safely
      const originalName = req.file.originalname;
      const extension = originalName.includes(".")
        ? originalName.split(".").pop()
        : "bin";

      //  Create R2 path
      const r2Path = `public/service-order-documents/${orderId}/${document_id}_${Date.now()}.${extension}`;

      //  Upload to R2 (no processing)
      await uploadToR2(fileBuffer, r2Path, req.file.mimetype);

      //  Delete temp file
      fs.unlinkSync(req.file.path);

      // Save in DB
      await ServiceOrderDocumentModel.uploadOrUpdate({
        order_id: orderId,
        document_id,
        file_path: r2Path,
      });

      res.json({
        success: true,
        message: "Document uploaded successfully",
      });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // submit documents
  async submitDocuments(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { orderId } = req.params;

      const order = await ServiceOrderModel.getOrderById(orderId, userId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const docs = await ServiceOrderDocumentModel.getRequiredDocs(orderId);

      // check mandatory docs
      const missingDocs = docs.filter((d) => d.is_mandatory && !d.uploaded);

      if (missingDocs.length) {
        return res.status(400).json({
          success: false,
          message: "Please upload all required documents",
          missing: missingDocs,
        });
      }

      // update order status
      await ServiceOrderModel.updateStatus(orderId, "documents_uploaded");

      res.json({
        success: true,
        message: "Documents uploaded successfully",
        data: {
          order_ref: order.order_ref,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // order status
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // validate status
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const affected = await ServiceOrderModel.updateStatus(id, status);

      if (!affected) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      res.json({
        success: true,
        message: "Order status updated",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new ServiceOrderController();
