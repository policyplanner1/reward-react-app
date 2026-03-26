const CheckoutModel = require("../models/checkoutModel");
const NotificationModel = require("../models/notificationModel");
const db = require("../../../../config/database");

class CheckoutController {
  // checkout cart Items
  async checkoutCart(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const companyId = req.body?.company_id ?? null;
      const addressId = req.body?.address_id;
      const useRewards = req.body?.use_rewards ?? true;

      if (!addressId) {
        return res.status(400).json({
          success: false,
          message: "Address is required",
        });
      }

      const orderId = await CheckoutModel.checkoutCart(
        userId,
        companyId,
        addressId,
        useRewards,
      );

      // await NotificationModel.create({
      //   userId,
      //   type: "order",
      //   title: "Order placed ✅",
      //   message: "Your order is confirmed and being processed.",
      //   reference_type: "order",
      //   reference_id: orderId,
      // });

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

      if (error.message === "INSUFFICIENT_REWARDS") {
        return res.status(400).json({
          success: false,
          message: "Not enough reward coins",
        });
      }

      if (error.message === "INVALID_ADDRESS") {
        return res.status(400).json({
          success: false,
          message: "Invalid address",
        });
      }

      if (error.message === "NOT_SERVICEABLE") {
        return res.status(400).json({
          success: false,
          message: "Delivery not available for this address",
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
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const {
        product_id,
        variant_id,
        quantity = 1,
        company_id,
        address_id,
        use_rewards = true,
      } = req.body;

      if (!address_id) {
        return res.status(400).json({
          success: false,
          message: "Address is required",
        });
      }

      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: "Product is required",
        });
      }

      const orderId = await CheckoutModel.buyNow({
        userId,
        productId: product_id,
        variantId: variant_id,
        quantity,
        companyId: company_id || null,
        addressId: address_id,
        useRewards: use_rewards,
      });

      // await NotificationModel.create({
      //   userId,
      //   type: "order",
      //   title: "Order placed ✅",
      //   message: "Your order is confirmed and being processed.",
      //   reference_type: "order",
      //   reference_id: orderId,
      // });

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
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { use_rewards = "true" } = req.query;

      const checkoutData = await CheckoutModel.getCheckoutCart(
        userId,
        use_rewards === "true",
      );

      return res.json({
        success: true,
        mode: "cart",
        ...checkoutData,
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

  // get checkout buy now Details
  async getBuyNowCheckout(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { product_id, variant_id, qty = 1, use_rewards = true } = req.query;

      const checkoutData = await CheckoutModel.getBuyNowCheckout({
        productId: Number(product_id),
        variantId: Number(variant_id),
        quantity: Number(qty),
        useRewards: use_rewards === "true",
        userId,
      });

      return res.json({
        success: true,
        mode: "buy_now",
        ...checkoutData,
      });
    } catch (error) {
      console.error("Buy now checkout fetch error:", error);

      if (error.message === "OUT_OF_STOCK") {
        return res.status(400).json({
          success: false,
          message: "Item out of stock",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to load checkout",
      });
    }
  }

  // Order Success
  async getOrderReceipt(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const orderId = Number(req.params.orderId);

      const receipt = await CheckoutModel.getOrderReceipt({
        userId,
        orderId,
      });

      return res.json({
        success: true,
        receipt,
      });
    } catch (error) {
      console.error("Order receipt error:", error);

      if (error.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to fetch order receipt",
      });
    }
  }
}

module.exports = new CheckoutController();
