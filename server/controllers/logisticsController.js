const orderModel = require("../models/orderModel");
const db = require("../config/database");
const xpressService = require("../services/ExpressBees/xpressbees_service");

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
      const { variantId, pincode, paymentType = "prepaid" } = req.body;

      if (!variantId || !pincode) {
        return res.json({
          success: false,
          message: "Missing variantId or pincode",
        });
      }

      // 1 Fetch variant + vendor
      const [[variant]] = await db.execute(
        `
      SELECT 
        v.weight,
        v.length,
        v.breadth,
        v.height,
        v.sale_price,
        p.vendor_id,
        p.delivery_sla_min_days,
        p.delivery_sla_max_days
      FROM product_variants v
      JOIN eproducts p ON v.product_id = p.product_id
      WHERE v.variant_id = ?
      `,
        [variantId],
      );

      if (!variant) {
        return res.json({ success: false, message: "Variant not found" });
      }

      // 2 Fetch vendor shipping address
      const [[vendorAddress]] = await db.execute(
        `
      SELECT va.pincode
      FROM vendor_addresses va
      WHERE va.vendor_id = ?
        AND va.type = 'shipping'
      LIMIT 1
      `,
        [variant.vendor_id],
      );

      if (!vendorAddress) {
        return res.json({
          success: false,
          message: "Vendor shipping address not configured",
        });
      }

      // 3 Convert units
      const weight = Math.round(variant.weight * 1000); // KG → grams
      const length = Math.round(Number(variant.length));
      const breadth = Math.round(Number(variant.breadth));
      const height = Math.round(Number(variant.height));

      // 4 Call serviceability
      const serviceResponse = await xpressService.checkServiceability({
        origin: vendorAddress.pincode,
        destination: pincode,
        payment_type: paymentType,
        order_amount: variant.sale_price.toString(),
        weight: weight.toString(),
        length: length.toString(),
        breadth: breadth.toString(),
        height: height.toString(),
      });

      console.log(serviceResponse, "serviceResponse");

      if (!serviceResponse.status || !serviceResponse.data.length) {
        return res.json({
          success: true,
          serviceable: false,
        });
      }

      // 5 sort the options
      const sortedOptions = serviceResponse.data.sort(
        (a, b) => a.total_charges - b.total_charges,
      );

      // 6 Prepare clean options
      const deliveryOptions = sortedOptions.map((option) => ({
        courier_id: option.id,
        courier_name: option.name,
        delivery_type: classifyService(option.name),
        shipping_charges: option.total_charges,
        chargeable_weight: option.chargeable_weight,
        estimated_delivery:
          variant.delivery_sla_min_days +
          "-" +
          variant.delivery_sla_max_days +
          " days",
      }));

      return res.json({
        success: true,
        serviceable: true,
        default_option: deliveryOptions[0],
        options: deliveryOptions,
      });
    } catch (err) {
      console.error("Serviceability Error:", err.response?.data || err.message);
      return res.json({
        success: false,
        message: "Serviceability check failed",
      });
    }
  }
}

module.exports = new LogisticsController();
