const orderModel = require("../models/orderModel");
const db = require("../config/database");
const xpressService = require("../services/ExpressBees/xpressbees_service");

class OrderController {
  async getOrderList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const filters = {
        orderId: req.query.order_id ? Number(req.query.order_id) : null,
        orderRef: req.query.order_ref || null,
        status: req.query.status || null,
        userId: req.query.user_id ? Number(req.query.user_id) : null,
        companyId: req.query.company_id ? Number(req.query.company_id) : null,
        fromDate: req.query.from_date || null,
        toDate: req.query.to_date || null,
        page,
        limit,
      };

      const { orders, total } = await orderModel.getAdminOrderHistory(filters);

      return res.json({
        success: true,
        orders,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    } catch (error) {
      console.error("Admin order history error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch admin order history",
      });
    }
  }

  // order Details
  async getAdminOrderDetails(req, res) {
    try {
      const orderId = Number(req.params.orderId);

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Invalid order id",
        });
      }

      const data = await orderModel.getAdminOrderDetails(orderId);

      return res.json({
        success: true,
        ...data,
      });
    } catch (error) {
      console.error("Admin order details error:", error);

      if (error.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to fetch order details",
      });
    }
  }

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
}

module.exports = new OrderController();
