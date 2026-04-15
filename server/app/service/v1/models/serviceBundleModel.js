const db = require("../../../../config/database");

class ServiceBundleModel {
  async getBundleItems(bundleId) {
    const [rows] = await db.execute(
      `
    SELECT 
      bi.id,
      bi.service_id,
      bi.variant_id,
      bi.price,
      bi.is_required,

      s.name AS service_name,
      sv.variant_name,
      sv.title,
      sv.image_url

    FROM service_bundle_items bi
    JOIN services s ON s.id = bi.service_id
    JOIN service_variants sv ON sv.id = bi.variant_id

    WHERE bi.bundle_id = ?
    ORDER BY bi.sort_order
    `,
      [bundleId],
    );

    return rows;
  }

  async getBundleSections(bundleId) {
    const [rows] = await db.execute(
      `
    SELECT section_type, title, content
    FROM service_bundle_sections
    WHERE bundle_id = ?
    ORDER BY sort_order
    `,
      [bundleId],
    );

    return rows.map((r) => ({
      ...r,
      content: r.content ? JSON.parse(r.content) : null,
    }));
  }
}

module.exports = new ServiceBundleModel();
