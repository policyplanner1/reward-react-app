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

      // 1 Fetch order
      const [rows] = await db.execute(
        "SELECT * FROM eorders WHERE order_id = ?",
        [orderId],
      );

      if (!rows.length) {
        return res.json({ success: false, message: "Order not found" });
      }

      const order = rows[0];

      if (order.status !== "paid") {
        return res.json({
          success: false,
          message: "Order not paid",
        });
      }

      // 2 Prepare payload
      const payload = {
        order_number: order.order_ref,
        unique_order_number: "yes",
        payment_type: "prepaid",
        order_amount: order.total_amount,
        package_weight: 300,
        package_length: 10,
        package_breadth: 10,
        package_height: 10,
        request_auto_pickup: "yes",

        consignee: {
          name: order.contact_name,
          address: order.address,
          city: order.city,
          state: order.state,
          pincode: order.zipcode,
          phone: order.contact_phone,
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
        collectable_amount: 0,
      };

      // 3 Call API
      const shipmentResponse = await xpressService.bookShipment(payload);

      if (!shipmentResponse.status) {
        return res.json({
          success: false,
          message: shipmentResponse.message,
        });
      }

      const data = shipmentResponse.data;

      // 4 Save shipment
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
        awb: data.awb_number,
      });
    } catch (err) {
      console.error(err);
      return res.json({ success: false });
    }
  }
}

module.exports = new OrderController();
