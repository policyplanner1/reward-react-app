const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const ServiceModel = require("../models/serviceModel");
const { UPLOAD_BASE } = require("../../../../config/path");

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
        service_image: null,
      });

      let imagePath = null;

      // 2. Handle image
      if (req.file) {
        const serviceDir = path.join(
          UPLOAD_BASE,
          "services",
          String(serviceId),
        );

        fs.mkdirSync(serviceDir, { recursive: true });

        const finalPath = path.join(serviceDir, req.file.filename);

        fs.copyFileSync(req.file.path, finalPath);
        fs.unlinkSync(req.file.path);

        imagePath = `uploads/services/${serviceId}/${req.file.filename}`;

        await ServiceModel.updateImage(serviceId, imagePath);
      }

      res.status(201).json({
        success: true,
        message: "Service created successfully",
        data: { id: serviceId, service_image: imagePath },
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

      const existing = await ServiceModel.findById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      let imagePath = existing.service_image;

      if (req.file) {
        const serviceDir = path.join(UPLOAD_BASE, "services", String(id));
        fs.mkdirSync(serviceDir, { recursive: true });

        const finalPath = path.join(serviceDir, req.file.filename);

        // Delete old image first
        if (existing.service_image) {
          const oldPath = path.join(
            UPLOAD_BASE,
            existing.service_image.replace("uploads/", ""),
          );
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        fs.copyFileSync(req.file.path, finalPath);
        fs.unlinkSync(req.file.path);

        imagePath = `uploads/services/${id}/${req.file.filename}`;
      }

      // 🔥 Merge existing + new values
      const updatedData = {
        category_id: req.body.category_id ?? existing.category_id,
        name: req.body.name ?? existing.name,
        description: req.body.description ?? existing.description,
        price: req.body.price ?? existing.price,
        estimated_days: req.body.estimated_days ?? existing.estimated_days,
        status: req.body.status ?? existing.status,
        service_image: imagePath,
      };

      await ServiceModel.update(id, updatedData);

      res.json({
        success: true,
        message: "Service updated successfully",
        data: { service_image: imagePath },
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
