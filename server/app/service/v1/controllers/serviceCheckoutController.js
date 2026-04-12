const db = require("../../../../config/database");
const CartModel = require("../models/serviceCartModel");
const ServiceOrderModel = require("../models/serviceOrderModel");

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

      for (let item of items) {
        const order = await ServiceOrderModel.create({
          user_id: userId,
          service_id: item.service_id,
          variant_id: item.variant_id,
          enquiry_id: null,
          price: item.price * item.quantity,
          status: "documents_pending",
        });

        createdOrders.push(order);
      }

      // clear cart
      await CartModel.clearCart(cart.id);

      res.json({
        success: true,
        message: "Orders created successfully",
        data: {
          orders: createdOrders,
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

      // create single order
      const order = await ServiceOrderModel.create({
        user_id: userId,
        service_id,
        variant_id,
        enquiry_id: null,
        price: variant.price,
        status: "documents_pending",
      });

      res.json({
        success: true,
        message: "Order created successfully",
        data: {
          order,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new ServiceCheckoutController();
