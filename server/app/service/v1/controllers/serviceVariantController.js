const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const ServiceVariantModel = require("../models/serviceVariantModel");

class ServiceVariantController {
  // create variant
  async addVariant(req, res) {
    try {
      const { service_id, variant_name, title, short_description, price } =
        req.body;

      if (
        !service_id ||
        !variant_name ||
        !title ||
        !short_description ||
        !price
      ) {
        return res.status(400).json({
          success: false,
          message:
            "service_id, variant_name,title,short description and price are required",
        });
      }

      const id = await ServiceVariantModel.create({
        service_id,
        variant_name,
        title,
        short_description,
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

  // add Variant Description
  async addVariantSection(req, res) {
    try {
      const { variant_id, section_type, title, content, sort_order } = req.body;

      if (!variant_id || !section_type || !content) {
        return res.status(400).json({
          success: false,
          message: "variant_id, section_type and content are required",
        });
      }

      const id = await ServiceVariantModel.addVariantSection({
        variant_id,
        section_type,
        title,
        content,
        sort_order,
      });

      res.status(201).json({
        success: true,
        message: "Section added",
        data: { id },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // get variant Description
  async getVariantSection(req, res) {
    try {
      const { variantId } = req.params;

      const sections = await ServiceVariantModel.getVariantSection(variantId);

      res.json({
        success: true,
        data: sections,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // delete a section
  async deleteVariantSection(req, res) {
    try {
      const { id } = req.params;

      await ServiceVariantModel.deleteVariantSection(id);

      res.json({
        success: true,
        message: "Section deleted",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ServiceVariantController();
