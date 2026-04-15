const db = require("../../../../config/database");
const CartModel = require("../models/serviceCartModel");

class ServiceCartController {
  async addToCart(req, res) {
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

      // get variant price
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

      const cart = await CartModel.getOrCreateCart(userId);

      await CartModel.addItem(cart.id, {
        service_id,
        variant_id,
        price: variant.price,
      });

      res.json({
        success: true,
        message: "Added to cart",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // add bundle items to cart
  async addBundleToCart(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId=1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { bundleId } = req.params;
      const { selected_items } = req.body || {};

      if (!bundleId) {
        return res.status(400).json({
          success: false,
          message: "bundleId required",
        });
      }

      // get cart
      const cart = await CartModel.getOrCreateCart(userId);

      // get bundle items
      const [items] = await db.execute(
        `SELECT * FROM service_bundle_items WHERE bundle_id = ?`,
        [bundleId],
      );

      const insertedItems = [];

      for (let item of items) {
        // skip optional items if not selected
        if (
          item.is_required === 0 &&
          selected_items &&
          !selected_items.includes(item.id)
        ) {
          continue;
        }

        // add to cart
        await CartModel.addItem(cart.id, {
          service_id: item.service_id,
          variant_id: item.variant_id,
          price: item.price,
          quantity: 1,
        });

        insertedItems.push(item.id);
      }

      res.json({
        success: true,
        message: "Bundle added to cart",
        data: {
          added_items: insertedItems,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  //   Get cart items for user
  async getCart(req, res) {
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

      const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      res.json({
        success: true,
        data: {
          items,
          total,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async removeItem(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { id } = req.params;

      await CartModel.removeItem(id);

      res.json({
        success: true,
        message: "Item removed",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async clearCart(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const cart = await CartModel.getOrCreateCart(userId);

      await CartModel.clearCart(cart.id);

      res.json({
        success: true,
        message: "Cart cleared",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ServiceCartController();
