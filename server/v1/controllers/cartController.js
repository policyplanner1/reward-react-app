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
      return res
        .status(500)
        .json({ success: false, message: "Internal server Error" });
    }
  }

  // add to cart
  async addToCart(req, res) {
    try {
      const userId = req.user?.user_id;
      const { product_id, variant_id, quantity = 1 } = req.body;

      if (!product_id || !variant_id) {
        return res.status(400).json({
          success: false,
          message: "Product and variant are required",
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid quantity",
        });
      }

      await CartModel.addToCart({
        userId,
        productId: product_id,
        variantId: variant_id,
        quantity,
      });

      return res.json({
        success: true,
        message: "Item added to cart",
      });
    } catch (error) {
      console.error("Add to cart error:", error);

      if (error.message === "INVALID_VARIANT") {
        return res.status(400).json({
          success: false,
          message: "Invalid product variant",
        });
      }

      if (error.message === "INSUFFICIENT_STOCK") {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // update cart item
  async updateCartItem(req, res) {
    try {
      const userId = req.user?.user_id;
      const cartItemId = Number(req.params.cart_item_id);
      const { quantity } = req.body;

      if (!cartItemId || quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: "Invalid request",
        });
      }

      if (quantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity cannot be negative",
        });
      }

      const result = await CartModel.updateCartItem({
        userId,
        cartItemId,
        quantity,
      });

      return res.json({
        success: true,
        message: result.removed
          ? "Item removed from cart"
          : "Cart updated successfully",
      });
    } catch (error) {
      console.error("Update cart error:", error);

      if (error.message === "CART_ITEM_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Cart item not found",
        });
      }

      if (error.message === "INSUFFICIENT_STOCK") {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new CartController();
