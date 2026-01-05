const CartModel = require("../models/cartModel");
const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class CartController {
  // Get cart items
  async getCart(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: "User ID is required" });
      }

      const cart = await CartModel.getUserCart(userId);

      return res.json({
        success: true,
        items: cart.items,
        cartTotal: cart.cartTotal,
      });
    } catch (error) {
      console.error("Get cart error:", error);
      return res.status(500).json({ success: false, message: 'Internal server Error' });
    }
  }
}

module.exports = new CartController();
