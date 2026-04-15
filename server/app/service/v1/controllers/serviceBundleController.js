const db = require("../../../../config/database");

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

      // items
      const [items] = await db.execute(
        `
      SELECT 
        s.name AS service_name,
        sv.variant_name,
        sv.image_url,
        sv.title,
        bi.price,
        bi.is_required,
        bi.service_id,
        bi.variant_id

      FROM service_bundle_items bi
      JOIN services s ON s.id = bi.service_id
      JOIN service_variants sv ON sv.id = bi.variant_id

      WHERE bi.bundle_id = ?
      ORDER BY bi.sort_order
      `,
        [id],
      );

      res.json({
        success: true,
        data: {
          bundle,
          items,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ServiceBundleController();
