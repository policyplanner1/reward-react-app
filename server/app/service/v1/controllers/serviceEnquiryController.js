const db = require("../../../../config/database");
const ServiceEnquiryModel = require("../models/serviceEnquiryModel");

class ServiceEnquiryController {
  async createEnquiry(req, res) {
    try {
      const {
        service_id,
        variant_id,
        name,
        city,
        mobile,
        email,
        enquiry_data,
      } = req.body;

      if (!service_id || !name || !mobile) {
        return res.status(400).json({
          success: false,
          message: "service_id, name and mobile are required",
        });
      }

      const id = await ServiceEnquiryModel.create({
        service_id,
        variant_id,
        name,
        city,
        mobile,
        email,
        enquiry_data,
      });

      res.status(201).json({
        success: true,
        message: "Enquiry submitted successfully",
        data: { id },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Fetch all Enquiries
  async getAllEnquiries(req, res) {
    try {
      const enquiries = await ServiceEnquiryModel.findAll();

      res.json({
        success: true,
        data: enquiries,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Get Enquiry By Id
  async getEnquiryById(req, res) {
    try {
      const { id } = req.params;

      const enquiry = await ServiceEnquiryModel.findById(id);

      if (!enquiry) {
        return res.status(404).json({
          success: false,
          message: "Enquiry not found",
        });
      }

      res.json({
        success: true,
        data: enquiry,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new ServiceEnquiryController();
