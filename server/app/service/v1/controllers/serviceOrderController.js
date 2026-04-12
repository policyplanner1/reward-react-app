const ServiceOrderModel = require("../models/serviceOrderModel");
const ServiceEnquiryModel = require("../models/serviceEnquiryModel");

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
}

module.exports = new ServiceOrderController();
