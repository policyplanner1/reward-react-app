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

  // Track Order status
  async getTracking(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { orderId } = req.params;

      const [orders] = await db.query(
        `SELECT order_id
       FROM eorders
       WHERE order_id = ?
         AND user_id = ?
       LIMIT 1`,
        [orderId, userId],
      );

      if (!orders.length) {
        return res.status(404).json({ message: "Order not found" });
      }

      // ==========================
      // FETCH SHIPMENTS
      // ==========================
      const [shipments] = await db.query(
        `SELECT
         id,
         vendor_id,
         courier_name,
         awb_number,
         shipping_status,
         booked_at,
         picked_up_at,
         in_transit_at,
         out_for_delivery_at,
         delivered_at
       FROM order_shipments
       WHERE order_id = ?`,
        [orderId],
      );

      const TRACKING_STEPS = [
        { key: "processing", label: "Processing" },
        { key: "shipped", label: "Shipped" },
        { key: "out_for_delivery", label: "Out for Delivery" },
        { key: "delivered", label: "Delivered" },
      ];

      function mapStatusToStep(status) {
        if (["pending", "booking_in_progress", "booked"].includes(status))
          return 0;
        if (["picked_up", "in_transit"].includes(status)) return 1;
        if (status === "out_for_delivery") return 2;
        if (status === "delivered") return 3;
        return 0;
      }

      //  Add label to each shipment
      const formattedShipments = shipments.map((s) => {
        const currentStep = mapStatusToStep(s.shipping_status);

        const steps = TRACKING_STEPS.map((step, index) => ({
          ...step,
          completed: index <= currentStep,
          current: index === currentStep,
        }));

        return {
          shipment_id: s.id,
          courier: s.courier_name,
          awb: s.awb_number,
          status: s.shipping_status,
          current_step: currentStep,
          steps,

          // timeline timestamps
          timeline: {
            booked: s.booked_at,
            picked_up: s.picked_up_at,
            in_transit: s.in_transit_at,
            out_for_delivery: s.out_for_delivery_at,
            delivered: s.delivered_at,
          },
        };
      });

      return res.json({
        order_id: orderId,
        shipments: formattedShipments,
      });
    } catch (err) {
      console.error("Tracking API error:", err);
      res.status(500).json({ message: "Tracking fetch failed" });
    }
  }

  // Shipment cancellation
  async cancelShipmentHandler(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1;

      // if (!userId) {
      //   return res.status(401).json({
      //     success: false,
      //     message: "Unauthorized user",
      //   });
      // }

      const { shipmentId } = req.params;

      // Authorization check
      const [rows] = await db.query(
        `SELECT os.order_id, o.user_id
       FROM order_shipments os
       JOIN eorders o ON os.order_id = o.order_id
       WHERE os.id = ?
         AND o.user_id = ?
       LIMIT 1`,
        [shipmentId, userId],
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      const { order_id } = rows[0];

      // Cancel
      await xpressService.cancelShipment(shipmentId);

      return res.json({
        success: true,
        message: "Shipment cancelled successfully",
        order_id,
      });
    } catch (err) {
      console.error("Cancel shipment error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new LogisticsController();
