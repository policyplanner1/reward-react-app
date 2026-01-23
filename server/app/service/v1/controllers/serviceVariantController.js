const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const ServiceVariantModel = require("../models/serviceVariantModel");

class ServiceVariantController {
  // create variant
  async addVariant(req, res) {
    try {
      const {
        service_id,
        variant_name,
        title,
        short_description,
        features,
        price,
      } = req.body;

      if (
        !service_id ||
        !variant_name ||
        !title ||
        !short_description ||
        !features ||
        !price
      ) {
        return res.status(400).json({
          success: false,
          message:
            "service_id, variant_name,title,short description,features  and price are required",
        });
      }

      const id = await ServiceVariantModel.create({
        service_id,
        variant_name,
        title,
        short_description,
        features,
        price,
      });

      res.status(201).json({
        success: true,
        message: "Variant added successfully",
        data: { id },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  //   get variant by service Id
  async getVariantsByService(req, res) {
    try {
      const { serviceId } = req.params;

      const variants = await ServiceVariantModel.findByServiceId(serviceId);

      res.json({
        success: true,
        data: variants,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  //   Delete a variant
  async deleteVariant(req, res) {
    try {
      const { id } = req.params;

      await ServiceVariantModel.delete(id);

      res.json({
        success: true,
        message: "Variant removed successfully",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ServiceVariantController();
