const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ServiceCategoryModel = require("../models/serviceCategoryModel");

class ServiceController {
  // Find all services
  async getServices(req, res) {
    try {
      const { category_id } = req.query;

      const services = await ServiceModel.findAll({
        category_id,
      });

      res.json({
        success: true,
        data: services,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // create services
  async createService(req, res) {
    try {
      const { category_id, name, description, price, estimated_days, status } =
        req.body;

      if (!category_id || !name || !price) {
        return res.status(400).json({
          success: false,
          message: "category_id, name, and price are required",
        });
      }

      const serviceId = await ServiceModel.create({
        category_id,
        name,
        description,
        price,
        estimated_days,
        status,
      });

      res.status(201).json({
        success: true,
        message: "Service created successfully",
        data: { id: serviceId },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Get services By Id
  async getServiceById(req, res) {
    try {
      const { id } = req.params;

      const service = await ServiceModel.findById(id);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      res.json({
        success: true,
        data: service,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Update services
  async updateService(req, res) {
    try {
      const { id } = req.params;

      const affected = await ServiceModel.update(id, req.body);

      if (!affected) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      res.json({
        success: true,
        message: "Service updated successfully",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Delete services
  async deleteService(req, res) {
    try {
      const { id } = req.params;

      const affected = await ServiceModel.delete(id);

      if (!affected) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      res.json({
        success: true,
        message: "Service removed successfully",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new ServiceController();
