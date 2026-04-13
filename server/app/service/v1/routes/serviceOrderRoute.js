const express = require("express");
const router = express.Router();
const ServiceOrderController = require("../controllers/serviceOrderController");
const auth = require("../../../ecommerce/v1/middlewares/auth");
const upload = require("../../../../middleware/serviceCategoryUpload");
const {
  authenticateToken,
  authorizeRoles,
} = require("../../../../middleware/auth");

// Direct Order
router.post("/direct", auth, ServiceOrderController.createDirectOrder);

// Enquiry Order
router.post(
  "/from-enquiry/:enquiryId",
  auth,
  ServiceOrderController.createEnquiryOrder,
);

// Get all orders
router.get("/my-orders", auth, ServiceOrderController.getMyOrders);

// get order details
router.get("/order-details/:id", auth, ServiceOrderController.getOrderDetails);

// upload order document
router.post(
  "/upload-document/:orderId",
  auth,
  upload.single("file"),
  ServiceOrderController.uploadDocument,
);

// update the upload status
router.post(
  "/submit-documents/:orderId",
  auth,
  ServiceOrderController.submitDocuments,
);

// update order status
router.put(
  "/status/:id",
  authenticateToken,
  authorizeRoles("admin", "vendor_manager"),
  ServiceOrderController.updateOrderStatus,
);

module.exports = router;
