const db = require("../../../../config/database");
const CartModel = require("../models/serviceCartModel");
const ServiceOrderModel = require("../models/serviceOrderModel");
const crypto = require("crypto");

// helper function
const CDN_BASE_URL = "https://cdn.rewardplanners.com";
function getPublicUrl(path) {
  if (!path) return null;
  return `${CDN_BASE_URL}/${path}`;
}

//calculate summary utility function
function calculateSummary(items) {
  const item_total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const discount = 0;
  const reward_discount = 0;
  const delivery_fee = 0;
  const handling_fee = 0;

  const total =
    item_total - discount - reward_discount + delivery_fee + handling_fee;

  return {
    item_total,
    discount,
    reward_discount,
    delivery_fee,
    handling_fee,
    total,
  };
}

class ServiceCheckoutController {
  // checkout from cart
  async addToCheckout(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const cart = await CartModel.getOrCreateCart(userId);
      const items = await CartModel.getCart(cart.id);

      if (!items.length) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      const createdOrders = [];
      const parentOrderId = crypto.randomUUID();

      for (let item of items) {
        const order = await ServiceOrderModel.create({
          user_id: userId,
          service_id: item.service_id,
          variant_id: item.variant_id,
          enquiry_id: null,
          price: item.price * item.quantity,
          parent_order_id: parentOrderId,
          status: "documents_pending",
        });

        createdOrders.push(order);
      }

      // clear cart
      await CartModel.clearCart(cart.id);

      const firstOrder = createdOrders[0];

      res.json({
        success: true,
        message: "Orders created successfully",
        data: {
          orders: createdOrders,
          redirect_to: `/service-orders/upload-documents/${firstOrder.id}`,
          first_order_id: firstOrder.id,
        },
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // buy now
  async buyNow(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { service_id, variant_id } = req.body;

      if (!service_id || !variant_id) {
        return res.status(400).json({
          success: false,
          message: "service_id and variant_id required",
        });
      }

      // get price from variant
      const [[variant]] = await db.execute(
        `SELECT price FROM service_variants WHERE id = ?`,
        [variant_id],
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Variant not found",
        });
      }

      const parentOrderId = crypto.randomUUID();

      // create single order
      const order = await ServiceOrderModel.create({
        user_id: userId,
        service_id,
        variant_id,
        enquiry_id: null,
        price: variant.price,
        parent_order_id: parentOrderId,
        status: "documents_pending",
      });

      res.json({
        success: true,
        message: "Order created successfully",
        data: {
          orders: [order],
          redirect_to: `/service-orders/upload-documents/${order.id}`,
          first_order_id: order.id,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // checkout preview for cart
  async getCheckoutPreview(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const cart = await CartModel.getOrCreateCart(userId);
      const items = await CartModel.getCart(cart.id);

      if (!items.length) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      const summary = calculateSummary(items);

      res.json({
        success: true,
        data: {
          type: "cart",
          items,
          summary,
        },
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getBuyNowPreview(req, res) {
    try {
      const { service_id, variant_id } = req.body;

      if (!service_id || !variant_id) {
        return res.status(400).json({
          success: false,
          message: "service_id and variant_id required",
        });
      }

      const [[variant]] = await db.execute(
        `
      SELECT 
        sv.id,
        sv.price,
        sv.variant_name,
        sv.title,
        sv.image_url,
        s.name AS service_name
      FROM service_variants sv
      JOIN services s ON s.id = sv.service_id
      WHERE sv.id = ?
      `,
        [variant_id],
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Variant not found",
        });
      }

      const items = [
        {
          service_id,
          variant_id,
          service_name: variant.service_name,
          variant_name: variant.variant_name,
          image_url: getPublicUrl(variant.image_url),
          title: variant.title,
          price: parseFloat(variant.price),
          quantity: 1,
        },
      ];

      const summary = calculateSummary(items);

      res.json({
        success: true,
        data: {
          type: "buy_now",
          items,
          summary,
        },
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new ServiceCheckoutController();
