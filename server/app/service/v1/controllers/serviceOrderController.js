const ServiceOrderModel = require("../models/serviceOrderModel");
const ServiceEnquiryModel = require("../models/serviceEnquiryModel");

class ServiceOrderController {
  async createDirectOrder(req, res) {
    try {
      // const user_id=req.user.user_id;
      const user_id=1;
      const {service_id, variant_id, price } = req.body;

      if (!user_id || !service_id || !price) {
        return res.status(400).json({
          success: false,
          message: "user_id, service_id and price are required",
        });
      }

      const order = await ServiceOrderModel.create({
        user_id,
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

  async createEnquiryOrder(req, res) {
    try {
      const { enquiryId } = req.params;

      const enquiry = await ServiceEnquiryModel.findById(enquiryId);

      if (!enquiry) {
        return res.status(404).json({
          success: false,
          message: "Enquiry not found",
        });
      }

      const order = await ServiceOrderModel.create({
        user_id: null,
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
