const orderModel = require("../models/orderModel");
const db = require("../config/database");
const xpressService = require("../services/ExpressBees/xpressbees_service");

class LogisticsController {
  // create shipment
  async createShipment(req, res) {
    try {
      const orderId = Number(req.params.orderId);

      const orderDetails = await orderModel.getAdminOrderDetails(orderId);

      if (!orderDetails) {
        return res.json({ success: false, message: "Order not found" });
      }

      const { order, address, items, summary } = orderDetails;

      if (order.status !== "paid") {
        return res.json({
          success: false,
          message: "Order not paid",
        });
      }

      // Check if shipment already exists
      const [[existingShipment]] = await db.execute(
        `SELECT awb_number FROM shipments WHERE order_id = ?`,
        [orderId],
      );

      if (existingShipment) {
        return res.json({
          success: false,
          message: "Shipment already created for this order",
        });
      }

      // 2 Convert Items → Xpressbees Format (MANDATORY)
      const orderItems = items.map((item) => ({
        name: item.product_name,
        qty: item.quantity.toString(),
        price: item.price.toString(),
        sku: item.product_id.toString(),
      }));

      // 3 Decide Payment Mode
      const paymentType = "prepaid";
      const collectableAmount = paymentType === "cod" ? summary.order_total : 0;

      // 4 Prepare Booking Payload
      const payload = {
        order_number: order.order_ref,
        unique_order_number: "yes",

        shipping_charges: 0,
        discount: 0,
        cod_charges: 0,

        payment_type: paymentType,
        order_amount: summary.order_total,

        package_weight: 50,
        package_length: 10,
        package_breadth: 10,
        package_height: 10,

        request_auto_pickup: "yes",

        consignee: {
          name: address.name,
          address: `${address.line1} ${address.line2 || ""}`,
          city: address.city,
          state: address.state,
          pincode: address.zipcode,
          phone: address.phone,
        },

        pickup: {
          warehouse_name: "Main Warehouse",
          name: "Vendor Name",
          address: "Vendor Address",
          city: "Gurgaon",
          state: "Haryana",
          pincode: "122001",
          phone: "9999999999",
        },

        courier_id: "1",
        collectable_amount: collectableAmount,
        order_items: orderItems,
      };

      // 5 call Xpressbees API
      const shipmentResponse = await xpressService.bookShipment(payload);

      if (!shipmentResponse.status) {
        return res.json({
          success: false,
          message: shipmentResponse.message,
        });
      }

      const data = shipmentResponse.data;

      // 6 Save Shipment
      await db.execute(
        `INSERT INTO shipments 
       (order_id, shipment_id, awb_number, courier_name, shipping_status, label_url, manifest_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          data.shipment_id,
          data.awb_number,
          data.courier_name,
          data.status,
          data.label,
          data.manifest,
        ],
      );

      return res.json({
        success: true,
        shipment: {
          awb_number: data.awb_number,
          shipping_status: data.status,
        },
      });
    } catch (err) {
      console.error("XPRESS ERROR:", err.response?.data);
      return res.json({
        success: false,
        message: "Shipment creation failed",
      });
    }
  }

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

      const bestOption = serviceResponse.data[0];

      return res.json({
        success: true,
        serviceable: true,
        estimated_delivery_days: bestOption.estimated_delivery_days,
        shipping_charges: bestOption.total_charges,
        courier_name: bestOption.courier_name,
      });
    } catch (err) {
      console.error("Serviceability Error:", err.response?.data);
      return res.json({
        success: false,
        message: "Serviceability check failed",
      });
    }
  }
}

module.exports = new LogisticsController();
