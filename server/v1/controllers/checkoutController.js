const CheckoutModel = require("../models/checkoutModel");
const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class CheckoutController {
  // checkout cart Items
  async checkoutCart(req, res) {
    try {
      const userId = req.user?.user_id;
      const companyId = req.body.company_id || null;

      const orderId = await CheckoutModel.checkoutCart(userId, companyId);

      return res.json({
        success: true,
        message: "Order placed successfully",
        order_id: orderId,
      });
    } catch (error) {
      console.error("Checkout cart error:", error);

      if (error.message === "CART_EMPTY") {
        return res
          .status(400)
          .json({ success: false, message: "Cart is empty" });
      }

      if (error.message === "OUT_OF_STOCK") {
        return res.status(400).json({
          success: false,
          message: "One or more items are out of stock",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Checkout failed",
      });
    }
  }

  // checkout buy now Items
  async buyNow(req, res) {
    try {
      const userId = req.user?.user_id;
      const { product_id, variant_id, quantity = 1, company_id } = req.body;

      const orderId = await CheckoutModel.buyNow({
        userId,
        productId: product_id,
        variantId: variant_id,
        quantity,
        companyId: company_id || null,
      });

      return res.json({
        success: true,
        message: "Order placed successfully",
        order_id: orderId,
      });
    } catch (error) {
      console.error("Buy now error:", error);

      if (error.message === "OUT_OF_STOCK") {
        return res.status(400).json({
          success: false,
          message: "Item out of stock",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Checkout failed",
      });
    }
  }

  // Get checkout cart Details
  async getCheckoutCart(req, res) {
    try {
      const userId = req.user?.user_id;

      const checkoutData = await CheckoutModel.getCheckoutCart(userId);

      return res.json({
        success: true,
        mode: "cart",
        items: checkoutData.items,
        totalAmount: checkoutData.totalAmount,
      });
    } catch (error) {
      console.error("Checkout cart fetch error:", error);

      if (error.message === "CART_EMPTY") {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      if (error.message === "OUT_OF_STOCK") {
        return res.status(400).json({
          success: false,
          message: "One or more items are out of stock",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to load checkout",
      });
    }
  }
}

module.exports = new CheckoutController();
