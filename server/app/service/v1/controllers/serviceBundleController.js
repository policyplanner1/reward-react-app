const db = require("../../../../config/database");
const ServiceBundleModel = require("../models/serviceBundleModel");

// Helper function
function formatBundleSections(sections) {
  const formatted = {
    features: [],
    details: [],
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

class ServiceBundleController {
  // service bundle list
  async getServiceBundles(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT id, name, description, bundle_price, original_price, banner_image
       FROM service_bundles
       WHERE status = 1`,
      );

      res.json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error("Error fetching service bundles:", error);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  //   Bundle by ID
  async getServiceBundleDetail(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json({ success: false, message: "Bundle ID is required" });
      }

      // bundle
      const [[bundle]] = await db.execute(
        `SELECT * FROM service_bundles WHERE id = ?`,
        [id],
      );

      if (!bundle) {
        return res
          .status(404)
          .json({ success: false, message: "Bundle not found" });
      }

      // 2 Items (services inside bundle)
      const items = await ServiceBundleModel.getBundleItems(id);

      // 3 Sections (features, stats etc)
      const sectionsRaw = await ServiceBundleModel.getBundleSections(id);
      const sections = formatBundleSections(sectionsRaw);

      // 4 Enquiry fields
      const enquiryFields = await ServiceBundleModel.findFormByBundleId(id);

      // 5  Calculate pricing summary
      const total_price = items.reduce((sum, i) => sum + Number(i.price), 0);

      res.json({
        success: true,
        data: {
          bundle,
          items,
          sections,
          enquiry_fields: enquiryFields,
          pricing: {
            total_price,
            bundle_price: bundle.bundle_price,
            savings: total_price - bundle.bundle_price,
          },
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ServiceBundleController();
