const db = require("../../../../config/database");
const xpressService = require("../../../../services/ExpressBees/xpressbees_service");

// Helper function
const classifyService = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("air")) return "express";
  if (lower.includes("surface")) return "standard";
  return "economy";
};

class LogisticsController {
  // check serviceAbility
  async checkServiceAbility(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const {
        mode = "buy_now",
        variantId,
        quantity = 1,
        pincode,
        paymentType = "prepaid",
      } = req.body;

      if (!pincode) {
        return res.json({ success: false, message: "Pincode required" });
      }

      let vendorGroups = {};

      // =============================
      // BUY NOW MODE
      // =============================
      if (mode === "buy_now") {
        if (!variantId) {
          return res.json({ success: false, message: "variantId required" });
        }

        const [[variant]] = await db.execute(
          `
        SELECT 
          v.weight,
          v.length,
          v.breadth,
          v.height,
          v.sale_price,
          p.vendor_id
        FROM product_variants v
        JOIN eproducts p ON v.product_id = p.product_id
        WHERE v.variant_id = ?
        `,
          [variantId],
        );

        if (!variant) {
          return res.json({ success: false, message: "Variant not found" });
        }

        vendorGroups[variant.vendor_id] = {
          totalWeightKg: quantity * Number(variant.weight),
          totalAmount: quantity * Number(variant.sale_price),
          length: variant.length,
          breadth: variant.breadth,
          height: quantity * variant.height,
        };
      }

      // =============================
      // CART MODE
      // =============================
      if (mode === "cart") {
        const [rows] = await db.execute(
          `
        SELECT 
          ci.quantity,
          v.weight,
          v.length,
          v.breadth,
          v.height,
          v.sale_price,
          p.vendor_id
        FROM cart_items ci
        JOIN product_variants v ON ci.variant_id = v.variant_id
        JOIN eproducts p ON v.product_id = p.product_id
        WHERE ci.user_id = ?
        `,
          [userId],
        );

        if (!rows.length) {
          return res.json({ success: false, message: "Cart empty" });
        }

        for (const row of rows) {
          if (!vendorGroups[row.vendor_id]) {
            vendorGroups[row.vendor_id] = {
              totalWeightKg: 0,
              totalAmount: 0,
              length: 0,
              breadth: 0,
              height: 0,
            };
          }

          const group = vendorGroups[row.vendor_id];

          group.totalWeightKg += row.quantity * Number(row.weight);
          group.totalAmount += row.quantity * Number(row.sale_price);
          group.length = Math.max(group.length, Number(row.length));
          group.breadth = Math.max(group.breadth, Number(row.breadth));
          group.height += Number(row.height) * row.quantity;
        }
      }

      // =============================
      // CALL COURIER FOR EACH VENDOR
      // =============================
      let finalOptions = [];

      for (const vendorId in vendorGroups) {
        const group = vendorGroups[vendorId];

        const [[vendorAddress]] = await db.execute(
          `
        SELECT pincode
        FROM vendor_addresses
        WHERE vendor_id = ?
          AND type = 'shipping'
        LIMIT 1
        `,
          [vendorId],
        );

        if (!vendorAddress) continue;

        const weightGrams = Math.round(group.totalWeightKg * 1000);

        const serviceResponse = await xpressService.checkServiceability({
          origin: vendorAddress.pincode,
          destination: pincode,
          payment_type: paymentType,
          order_amount: group.totalAmount.toString(),
          weight: weightGrams.toString(),
          length: Math.round(group.length).toString(),
          breadth: Math.round(group.breadth).toString(),
          height: Math.round(group.height).toString(),
        });

        if (!serviceResponse.status || !serviceResponse.data.length) continue;

        const sorted = serviceResponse.data.sort(
          (a, b) => a.total_charges - b.total_charges,
        );

        finalOptions.push({
          vendor_id: Number(vendorId),
          options: sorted.map((o) => ({
            courier_id: o.id,
            courier_name: o.name,
            delivery_type: classifyService(o.name),
            shipping_charges: o.total_charges,
            chargeable_weight: o.chargeable_weight,
            transit_days: o.transit_days || null,
            estimated_delivery_date: o.transit_days
              ? new Date(
                  Date.now() + o.transit_days * 24 * 60 * 60 * 1000,
                ).toISOString()
              : null,
          })),
        });
      }

      return res.json({
        success: true,
        serviceable: finalOptions.length > 0,
        vendors: finalOptions,
      });
    } catch (err) {
      console.error("Serviceability Error:", err.message);
      return res.json({
        success: false,
        message: "Serviceability check failed",
      });
    }
  }
}

module.exports = new LogisticsController();
