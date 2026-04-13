const ServiceOrderModel = require("../models/serviceOrderModel");
const ServiceEnquiryModel = require("../models/serviceEnquiryModel");
const ServiceOrderDocumentModel = require("../models/serviceOrderDocumentModel");
const { UPLOAD_BASE } = require("../../../../config/path");

const ALLOWED_STATUSES = [
  "pending_payment",
  "payment_done",
  "documents_pending",
  "documents_uploaded",
  "in_progress",
  "completed",
  "cancelled",
];

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
      const documents = await ServiceOrderDocumentModel.getRequiredDocs(
        order.id,
      );

      // timeline (UI stepper)
      const timeline = [
        {
          status: "Order Confirmed",
          completed: true,
        },
        {
          status: "Order in Progress",
          completed:
            order.status === "in_progress" || order.status === "completed",
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

      if (req.file) {
        const orderDir = path.join(
          UPLOAD_BASE,
          "service-order-documents",
          String(orderId),
        );

        fs.mkdirSync(orderDir, { recursive: true });

        const fileName = `${Date.now()}_${req.file.originalname}`;
        const finalPath = path.join(orderDir, fileName);

       fs.renameSync(req.file.path, finalPath);

        const filePath = `uploads/service-order-documents/${orderId}/${fileName}`;

        await ServiceOrderDocumentModel.uploadOrUpdate({
          order_id: orderId,
          document_id,
          file_path: filePath,
        });
      }

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
