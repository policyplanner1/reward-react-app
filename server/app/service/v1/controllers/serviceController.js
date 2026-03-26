const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const ServiceModel = require("../models/serviceModel");
const ServiceCategoryModel = require("../models/serviceCategoryModel");
const ServiceVariantModel = require("../models/serviceVariantModel");
const ServiceDocumentModel = require("../models/serviceDocumentModel");
const ServiceFormModel = require("../models/serviceFormModel");
const ServiceSectionModel = require("../models/serviceSectionModel");
const { UPLOAD_BASE } = require("../../../../config/path");

// =======================
// HELPER FUNCTION
// ====================
function formatVariantSections(sections) {
  const formatted = {
    features: [],
    details: [],
    journey: [],
    when_required:[],
    trust_stats: [],
    paragraphs: [],
  };

  sections.forEach((s) => {
    switch (s.section_type) {
      case "features":
        formatted.features = s.content;
        break;

      case "details":
        formatted.details = s.content;
        break;

      case "journey":
        formatted.journey = s.content;
        break;

      case "when_required":
        formatted.when_required = s.content;
        break;

      case "trust_stats":
        formatted.trust_stats = s.content;
        break;

      case "paragraph":
        formatted.paragraphs.push({
          title: s.title,
          content: s.content,
        });
        break;
    }
  });

  return formatted;
}

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

  // Get service by category Id
  async getServicesByCategory(req, res) {
    try {
      const { categoryId } = req.params;

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "Category id is required",
        });
      }

      // 1 Get category details
      const category = await ServiceCategoryModel.findById(categoryId);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // ================= DIRECT FLOW =================
      if (category.display_type === "direct") {
        if (!category.direct_service_id) {
          return res.status(400).json({
            success: false,
            message: "Direct service not configured",
          });
        }

        const service = await ServiceModel.findBasicById(
          category.direct_service_id,
        );

        if (!service) {
          return res.status(404).json({
            success: false,
            message: "Service not found",
          });
        }

        const variants = await ServiceVariantModel.getVariantsWithSections(
          service.id,
        );

        const hasVariants = variants && variants.length > 0;

        if (hasVariants) {
          for (let v of variants) {
            v.sections = await ServiceVariantModel.getSectionsByVariant(v.id);
          }
        }

        const documents = await ServiceDocumentModel.findActiveByServiceId(
          service.id,
        );

        const form = await ServiceFormModel.findFormByServiceId(service.id);

        return res.json({
          success: true,
          type: "direct",
          data: {
            category,
            service,
            variants: hasVariants ? variants : [],
            documents,
            enquiry_fields: form,
          },
        });
      }

      // ================= NORMAL FLOW =================
      const services = await ServiceModel.findByCategoryId(categoryId);

      return res.json({
        success: true,
        type: "list",
        data: {
          category,
          services,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Get all the service details in one api call

  async getServiceDetails(req, res) {
    try {
      const { id } = req.params;

      const service = await ServiceModel.findById(id);

      const variants = await ServiceVariantModel.getVariantsByService(id);

      for (let v of variants) {
        const sections = await ServiceVariantModel.getSectionsByVariant(
          v.id,
        );

        const formatted = formatVariantSections(sections);

        v.features = formatted.features;
        v.details = formatted.details;
        v.trust_stats = formatted.trust_stats;
        v.paragraphs = formatted.paragraphs;
        v.when_required = formatted.when_required;
        v.journey = formatted.journey;

        delete v.sections;
      }

      const documents = await ServiceDocumentModel.findActiveByServiceId(
        service.id,
      );

      const enquiryFields = await ServiceFormModel.findFormByServiceId(id);

      const serviceSections = await ServiceSectionModel.findByServiceId(id);

      res.json({
        success: true,
        data: {
          service,
          variants,
          documents,
          enquiry_fields: enquiryFields,
          service_sections: serviceSections, // includes FAQ
        },
      });
    } catch (err) {
      console.log(err.message);
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

      //  Merge existing + new values
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
