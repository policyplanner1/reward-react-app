const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const AddressModel = require("../models/addressModel");
const xpressService = require("../../../../services/ExpressBees/xpressbees_service");


function generateOrderRef() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${ymd}-${rand}`;
}

class CheckoutModel {
  async checkoutCart(userId, companyId = null, addressId) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // 1 Fetch cart items
      const [cartItems] = await conn.execute(
        `
        SELECT 
          ci.product_id,
          ci.variant_id,
          ci.quantity,
          v.sale_price,
          v.stock,
          v.weight,
          v.length,
          v.breadth,
          v.height,
          p.vendor_id
        FROM cart_items ci
        JOIN product_variants v ON ci.variant_id = v.variant_id
        JOIN eproducts p ON v.product_id = p.product_id
        WHERE ci.user_id = ?  
        FOR UPDATE
        `,
        [userId],
      );

      if (cartItems.length === 0) {
        throw new Error("CART_EMPTY");
      }

      // 2 Validate stock
      for (const item of cartItems) {
        if (item.quantity > item.stock) {
          throw new Error("OUT_OF_STOCK");
        }
      }

      // 3 Get customer address
      const customerAddress = await AddressModel.getAddressById(
        addressId,
        userId,
      );

      if (!customerAddress) {
        throw new Error("INVALID_ADDRESS");
      }

      console.log(customerAddress, "address");

      // 4 Group Items by Vendor
      const vendorGroups = {};

      for (const item of cartItems) {
        const vendorId = Number(item.vendor_id);

        if (!vendorGroups[vendorId]) {
          vendorGroups[vendorId] = {
            items: [],
            totalWeightKg: 0,
            totalAmount: 0,
            length: 0,
            breadth: 0,
            height: 0,
          };
        }

        vendorGroups[vendorId].items.push(item);

        // Weight in KG (assuming DB stores KG)
        vendorGroups[vendorId].totalWeightKg +=
          item.quantity * Number(item.weight);

        vendorGroups[vendorId].totalAmount +=
          item.quantity * Number(item.sale_price);

        // Dimension logic (basic box stacking logic)
        vendorGroups[vendorId].length = Math.max(
          vendorGroups[vendorId].length,
          Number(item.length),
        );

        vendorGroups[vendorId].breadth = Math.max(
          vendorGroups[vendorId].breadth,
          Number(item.breadth),
        );

        // stacking height
        vendorGroups[vendorId].height += Number(item.height) * item.quantity;
      }

      console.log(vendorGroups, "vendorGroups");

      // 5 calculate the service pricing
      const shippingResults = [];

      for (const vendorId in vendorGroups) {
        const vendor = vendorGroups[vendorId];

        const [[vendorAddress]] = await conn.execute(
          `SELECT pincode FROM vendor_addresses 
            WHERE vendor_id = ? AND type = 'shipping' LIMIT 1`,
          [vendorId],
        );

        if (!vendorAddress) {
          throw new Error("VENDOR_ADDRESS_MISSING");
        }

        const serviceResponse = await xpressService.checkServiceability({
          origin: vendorAddress.pincode,
          destination: customerAddress.zipcode,
          payment_type: "prepaid",
          order_amount: vendor.totalAmount.toString(),
          weight: Math.round(vendor.totalWeightKg * 1000).toString(),
          length: vendor.length.toString(),
          breadth: vendor.breadth.toString(),
          height: vendor.height.toString(),
        });

        if (!serviceResponse.status || !serviceResponse.data.length) {
          throw new Error("NOT_SERVICEABLE");
        }

        const cheapest = serviceResponse.data.sort(
          (a, b) => a.total_charges - b.total_charges,
        )[0];

        shippingResults.push({
          vendor_id: Number(vendorId),
          courier_id: cheapest.id,
          courier_name: cheapest.name,
          shipping_charges: Number(cheapest.total_charges),
          weight_grams: Math.round(vendor.totalWeightKg * 1000),
          length: vendor.length,
          breadth: vendor.breadth,
          height: vendor.height,
        });
      }

      console.log(shippingResults, "shippingResults");

      // 6 Calculate Totals
      const productTotal = cartItems.reduce(
        (sum, i) => sum + i.quantity * Number(i.sale_price),
        0,
      );

      const shippingTotal = shippingResults.reduce(
        (sum, s) => sum + s.shipping_charges,
        0,
      );

      console.log(productTotal, "productTotal");
      console.log(shippingTotal, "shippingTotal");

      const finalTotal = productTotal + shippingTotal;

      // 7 Create order
      const orderRef = generateOrderRef();

      const [orderRes] = await conn.execute(
        `
        INSERT INTO eorders (user_id, company_id, total_amount,order_ref,address_id)
        VALUES (?, ?, ?, ?, ?)
        `,
        [userId, companyId, finalTotal, orderRef, addressId],
      );

      const orderId = orderRes.insertId;

      console.log(orderId, "orderId");


      // 8 Order items + stock deduction
      for (const item of cartItems) {
        await conn.execute(
          `
        INSERT INTO eorder_items
        (order_id, product_id, variant_id, quantity, price)
        VALUES (?, ?, ?, ?, ?)
        `,
          [
            orderId,
            item.product_id,
            item.variant_id,
            item.quantity,
            item.sale_price,
          ],
        );

        await conn.execute(
          `
        UPDATE product_variants
        SET stock = stock - ?
        WHERE variant_id = ?
        `,
          [item.quantity, item.variant_id],
        );
      }

      // 9 Shipment creation
      for (const shipment of shippingResults) {
        await conn.execute(
          `
        INSERT INTO order_shipments
        (order_id, vendor_id, courier_id, courier_name,
         shipping_charges, weight, length, breadth, height, shipping_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `,
          [
            orderId,
            shipment.vendor_id,
            shipment.courier_id,
            shipment.courier_name,
            shipment.shipping_charges,
            shipment.weight_grams,
            shipment.length,
            shipment.breadth,
            shipment.height,
          ],
        );
      }

      // 7 Clear cart
      await conn.execute(`DELETE FROM cart_items WHERE user_id = ?`, [userId]);

      await conn.commit();
      return orderId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async buyNow({
    userId,
    productId,
    variantId,
    quantity,
    companyId = null,
    addressId,
  }) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // 1 Fetch variant
      const [[variant]] = await conn.execute(
        `
      SELECT sale_price, stock
      FROM product_variants
      WHERE variant_id = ? AND product_id = ?
      `,
        [variantId, productId],
      );

      if (!variant) {
        throw new Error("INVALID_VARIANT");
      }

      if (quantity > variant.stock) {
        throw new Error("OUT_OF_STOCK");
      }

      const totalAmount = quantity * variant.sale_price;

      // 2 Create order

      const orderRef = generateOrderRef();

      const [orderRes] = await conn.execute(
        `
      INSERT INTO eorders (user_id, company_id, total_amount, order_ref,address_id)
      VALUES (?, ?, ?, ?, ?)
      `,
        [userId, companyId, totalAmount, orderRef, addressId],
      );

      const orderId = orderRes.insertId;

      // 3 Create order item
      await conn.execute(
        `
      INSERT INTO eorder_items
        (order_id, product_id, variant_id, quantity, price)
      VALUES (?, ?, ?, ?, ?)
      `,
        [orderId, productId, variantId, quantity, variant.sale_price],
      );

      // 4 Deduct stock
      await conn.execute(
        `
      UPDATE product_variants
      SET stock = stock - ?
      WHERE variant_id = ?
      `,
        [quantity, variantId],
      );

      await conn.commit();
      return orderId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // GET CHECKOUT CART DETAILS
  async getCheckoutCart(userId) {
    const [rows] = await db.execute(
      `
      SELECT 
        ci.cart_item_id,
        ci.quantity,

        p.product_id,
        p.product_name,

        v.variant_id,
        v.mrp,
        v.sale_price,
        v.stock,
        v.reward_redemption_limit,

        (ci.quantity * v.sale_price) AS item_total,

        GROUP_CONCAT(
          DISTINCT pi.image_url
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM cart_items ci
      JOIN eproducts p ON ci.product_id = p.product_id
      JOIN product_variants v ON ci.variant_id = v.variant_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id

      WHERE ci.user_id = ?
      GROUP BY ci.cart_item_id
      `,
      [userId],
    );

    if (rows.length === 0) {
      throw new Error("CART_EMPTY");
    }

    let totalAmount = 0;
    let totalDiscount = 0;
    let payableAmount = 0;

    const items = rows.map((row) => {
      if (row.quantity > row.stock) {
        throw new Error("OUT_OF_STOCK");
      }

      const salePrice = Number(row.sale_price) || 0;
      const quantity = Number(row.quantity) || 0;
      const rewardPercent = Number(row.reward_redemption_limit) || 0;

      const itemTotal = salePrice * quantity;

      const rewardDiscountAmount = Math.round(
        (itemTotal * rewardPercent) / 100,
      );

      const finalItemTotal = itemTotal - rewardDiscountAmount;

      totalAmount += itemTotal;
      totalDiscount += rewardDiscountAmount;
      payableAmount += finalItemTotal;

      return {
        cart_item_id: row.cart_item_id,
        product_id: row.product_id,
        variant_id: row.variant_id,
        title: row.product_name,
        image: row.images ? row.images.split(",")[0] : null,
        mrp: row.mrp,
        price: salePrice,
        quantity,
        perUnitDiscount: Number(row.mrp) - salePrice,
        item_total: itemTotal,
        points: rewardDiscountAmount,
        final_item_total: finalItemTotal,
        stock: row.stock,
      };
    });

    return {
      items,
      totalAmount,
      totalDiscount,
      payableAmount,
    };
  }

  // Get buy now checkout Details
  async getBuyNowCheckout({ productId, variantId, quantity }) {
    const [[row]] = await db.execute(
      `
    SELECT 
      p.product_id,
      p.product_name,
      v.variant_id,
      v.mrp,
      v.sale_price,
      v.stock,
      v.reward_redemption_limit,
      GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order ASC) AS images
    FROM product_variants v
    JOIN eproducts p ON v.product_id = p.product_id
    LEFT JOIN product_images pi ON p.product_id = pi.product_id
    WHERE v.variant_id = ? AND p.product_id = ?
    GROUP BY v.variant_id
    `,
      [variantId, productId],
    );

    if (!row) {
      throw new Error("INVALID_VARIANT");
    }

    if (quantity > row.stock) {
      throw new Error("OUT_OF_STOCK");
    }

    const salePrice = Number(row.sale_price) || 0;
    const rewardPercent = Number(row.reward_redemption_limit) || 0;

    const itemTotal = salePrice * quantity;

    const rewardDiscountAmount = Math.round((itemTotal * rewardPercent) / 100);

    const finalItemTotal = itemTotal - rewardDiscountAmount;

    return {
      item: {
        product_id: row.product_id,
        variant_id: row.variant_id,
        title: row.product_name,
        image: row.images ? row.images.split(",")[0] : null,
        price: salePrice,
        quantity,
        perUnitDiscount: Number(row.mrp - salePrice),
        item_total: itemTotal,
        points: rewardDiscountAmount,
        final_item_total: finalItemTotal,
        stock: row.stock,
      },
      totalAmount: itemTotal,
      totalDiscount: rewardDiscountAmount,
      payableAmount: finalItemTotal,
    };
  }

  // Order Receipt
  async getOrderReceipt({ userId, orderId }) {
    // 1 Fetch order
    const [[order]] = await db.execute(
      `
    SELECT 
      o.order_id,
      o.order_ref,
      o.address_id,
      o.total_amount,
      o.created_at,
      o.status,
      ca.address_type,
      ca.address1,
      ca.address2,
      ca.city,
      cu.name AS customer_name,
      ca.zipcode,
      ca.landmark,
      s.state_name,
      c.country_name
    FROM eorders o
      JOIN customer_addresses ca 
      ON o.address_id = ca.address_id

      JOIN customer cu
      on o.user_id = cu.user_id

      LEFT JOIN states s
      ON ca.state_id = s.state_id

      LEFT JOIN countries c
      ON ca.country_id = c.country_id
    WHERE o.order_id = ?
      AND o.user_id = ?
    `,
      [orderId, userId],
    );

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    // 2 Fetch order items
    const [items] = await db.execute(
      `
    SELECT
      oi.product_id,
      oi.variant_id,
      oi.quantity,
      oi.price,
      p.product_name,

      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.product_id
        ORDER BY pi.sort_order ASC
        LIMIT 1
      ) AS image

    FROM eorder_items oi
    JOIN eproducts p ON oi.product_id = p.product_id
    WHERE oi.order_id = ?
    `,
      [orderId],
    );

    const itemTotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

    // static for Now
    const deliveryFee = 50;
    const bagDiscount = 1032;
    const rewardDiscount = 500;

    return {
      orderId: order.order_id,
      orderDate: order.created_at,
      status: order.status,
      username: order.customer_name,
      deliveryDate: "Saturday, Nov 29",
      address: {
        type: order.address_type,
        line1: order.address1,
        line2: order.address2,
        city: order.city,
        state: order.state_name,
        country: order.country_name,
        zipcode: order.zipcode,
        landmark: order.landmark,
      },
      items: items.map((i) => ({
        product_name: i.product_name,
        image: i.image,
        quantity: i.quantity,
        price: i.price,
        item_total: i.quantity * i.price,
      })),

      bill: {
        item_total: itemTotal,
        delivery_fee: deliveryFee,
        bag_discount: bagDiscount,
        reward_discount: rewardDiscount,
        order_total: order.total_amount,
      },

      rewardsEarned: 462,
    };
  }
}
module.exports = new CheckoutModel();
