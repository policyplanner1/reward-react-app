const CheckoutModel = require("../models/checkoutModel");
const db = require("../../../../config/database");
const {
  enqueueWhatsApp,
} = require("../../../../services/whatsapp/waEnqueueService");

class CheckoutController {
  // checkout cart Items
  async checkoutCart(req, res) {
    try {
      const userId = 1; // temporary
      const companyId = req.body?.company_id ?? null;

      const orderId = await CheckoutModel.checkoutCart(userId, companyId);

      // ✅ Fetch order + customer info for WhatsApp
      const orderCtx = await getOrderWhatsAppContext(orderId);

      if (orderCtx?.phone) {
        // ✅ enqueue (non-blocking)
        enqueueWhatsApp({
          eventName: "order_place_confirm",
          ctx: {
            phone: orderCtx.phone,
            company_id: orderCtx.company_id ?? companyId ?? null,
            customer_name: orderCtx.customer_name || "User",
            // ✅ prefer order_ref for customer-facing ID
            order_id: orderCtx.order_ref || orderCtx.order_id,
            total_amount: orderCtx.total_amount,
          },
        }).catch((e) => console.error("WA enqueue failed:", e?.message || e));
      } else {
        console.warn("WA not enqueued: missing customer phone for order:", orderId);
      }

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
      const userId = 1;

      const { product_id, variant_id, quantity = 1, company_id } = req.body;

      const orderId = await CheckoutModel.buyNow({
        userId,
        productId: product_id,
        variantId: variant_id,
        quantity,
        companyId: company_id || null,
      });

      // ✅ Fetch order + customer info for WhatsApp
      const orderCtx = await getOrderWhatsAppContext(orderId);

      if (orderCtx?.phone) {
        enqueueWhatsApp({
          eventName: "order_place_confirm",
          ctx: {
            phone: orderCtx.phone,
            company_id: orderCtx.company_id ?? company_id ?? null,
            customer_name: orderCtx.customer_name || "User",
            // ✅ prefer order_ref for customer-facing ID
            order_id: orderCtx.order_ref || orderCtx.order_id,
            total_amount: orderCtx.total_amount,
          },
        }).catch((e) => console.error("WA enqueue failed:", e?.message || e));
      } else {
        console.warn("WA not enqueued: missing customer phone for order:", orderId);
      }

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
      const userId = 1; // Temporary hardcoded user ID for testing

      const checkoutData = await CheckoutModel.getCheckoutCart(userId);

      return res.json({
        success: true,
        mode: "cart",
        items: checkoutData.items,
        totalAmount: checkoutData.totalAmount,
        totalDiscount: checkoutData.totalDiscount,
        payableAmount: checkoutData.payableAmount,
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
      const { product_id, variant_id, qty = 1 } = req.query;

      const checkoutData = await CheckoutModel.getBuyNowCheckout({
        productId: Number(product_id),
        variantId: Number(variant_id),
        quantity: Number(qty),
      });

      return res.json({
        success: true,
        mode: "buy_now",
        item: checkoutData.item,
        totalAmount: checkoutData.totalAmount,
        totalDiscount: checkoutData.totalDiscount,
        payableAmount: checkoutData.payableAmount,
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
      const userId = 1;
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

async function getOrderWhatsAppContext(orderId) {
  const [rows] = await db.execute(
    `
    SELECT 
      o.order_id,
      o.order_ref,
      o.company_id,
      o.total_amount,
      o.user_id,
      cu.name AS customer_name,
      cu.phone AS phone
    FROM eorders o
    JOIN customer cu ON cu.user_id = o.user_id
    WHERE o.order_id = ?
    LIMIT 1
    `,
    [orderId]
  );

  return rows[0] || null;
}

module.exports = new CheckoutController();
