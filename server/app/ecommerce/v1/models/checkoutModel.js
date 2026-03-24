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

function formatDate(date) {
  if (!date) return null;
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

async function generateInvoices(orderId, conn) {
  try {
    // 1 Fetch order items with vendor
    const [items] = await conn.query(
      `
      SELECT 
        oi.product_id,
        oi.variant_id,
        oi.quantity,
        oi.price,
        p.product_name,
        p.vendor_id,
        p.gst_slab,
        p.hsn_sac_code,
        v.sku
      FROM eorder_items oi
      JOIN eproducts p ON oi.product_id = p.product_id
      JOIN product_variants v ON oi.variant_id = v.variant_id
      WHERE oi.order_id = ?
      `,
      [orderId],
    );

    if (!items.length) {
      return;
    }

    // 2 Group items by vendor
    const vendorMap = {};

    for (const item of items) {
      if (!vendorMap[item.vendor_id]) {
        vendorMap[item.vendor_id] = [];
      }
      vendorMap[item.vendor_id].push(item);
    }

    // 3 Create invoice per vendor
    for (const vendorId of Object.keys(vendorMap)) {
      // Prevent duplicates
      const [[existing]] = await conn.query(
        `SELECT invoice_id FROM invoices 
         WHERE order_id = ? AND vendor_id = ? 
         LIMIT 1`,
        [orderId, vendorId],
      );

      if (existing) continue;

      const vendorItems = vendorMap[vendorId];
      const invoiceNumber = `INV-${orderId}-${vendorId}`;

      let subtotal = 0;
      let taxTotal = 0;

      // Calculate totals
      for (const item of vendorItems) {
        const lineSubtotal = Number(item.price) * Number(item.quantity);
        const gstRate = Number(item.gst_slab || 0);
        const taxAmount = lineSubtotal * (gstRate / 100);

        subtotal += lineSubtotal;
        taxTotal += taxAmount;
      }

      // 4 Fetch shipping charges for vendor
      const [[shipment]] = await conn.query(
        `
        SELECT shipping_charges
        FROM order_shipments
        WHERE order_id = ? AND vendor_id = ?
        LIMIT 1
        `,
        [orderId, vendorId],
      );

      const shippingCharges = Number(shipment?.shipping_charges || 0);

      const grandTotal = subtotal + taxTotal + shippingCharges;

      // 5 Create invoice
      const [invResult] = await conn.query(
        `
        INSERT INTO invoices
        (
          invoice_number,
          order_id,
          vendor_id,
          user_id,
          subtotal,
          tax_total,
          shipping_amount,
          grand_total
        )
        SELECT ?, o.order_id, ?, o.user_id, ?, ?, ?, ?
        FROM eorders o
        WHERE o.order_id = ?
        `,
        [
          invoiceNumber,
          vendorId,
          subtotal,
          taxTotal,
          shippingCharges,
          grandTotal,
          orderId,
        ],
      );

      const invoiceId = invResult.insertId;

      // 6 Insert invoice items
      for (const item of vendorItems) {
        const lineSubtotal = Number(item.price) * Number(item.quantity);
        const gstRate = Number(item.gst_slab || 0);

        const totalTax = lineSubtotal * (gstRate / 100);

        const cgst = totalTax / 2;
        const sgst = totalTax / 2;
        const igst = 0;

        const lineTotal = lineSubtotal + totalTax;

        await conn.query(
          `
            INSERT INTO invoice_items
            (
              invoice_id,
              product_id,
              variant_id,
              product_name,
              sku,
              quantity,
              unit_price,
              tax_rate,
              hsn_code,
              cgst_amount,
              sgst_amount,
              igst_amount,
              line_total
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
          [
            invoiceId,
            item.product_id,
            item.variant_id,
            item.product_name,
            item.sku,
            item.quantity,
            item.price,
            gstRate,
            item.hsn_sac_code,
            cgst,
            sgst,
            igst,
            lineTotal,
          ],
        );
      }
    }
  } catch (err) {
    throw err;
  }
}

class CheckoutModel {
  // Buy cart items
  async checkoutCart(userId, companyId = null, addressId, useRewards = true) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // ===============================
      // 0. WALLET (LOCK)
      // ===============================
      const [[wallet]] = await conn.execute(
        `SELECT balance FROM customer_wallet WHERE user_id = ? FOR UPDATE`,
        [userId],
      );

      let walletBalance = Number(wallet?.balance || 0);

      // 1 Fetch cart items
      const [cartItems] = await conn.execute(
        `
        SELECT 
          ci.product_id,
          ci.variant_id,
          ci.quantity,
          v.sale_price,
          v.mrp,
          v.stock,
          v.weight,
          v.length,
          v.breadth,
          v.height,
          v.reward_redemption_limit,
          p.vendor_id,
          prs.can_earn_reward,
          prs.can_redeem_reward,

          rr.reward_type,
          rr.reward_value,
          rr.max_reward

        FROM cart_items ci
        JOIN product_variants v ON ci.variant_id = v.variant_id
        JOIN eproducts p ON v.product_id = p.product_id

        LEFT JOIN product_reward_settings prs 
        ON prs.id = (
          SELECT prs2.id
          FROM product_reward_settings prs2
          WHERE prs2.product_id = ci.product_id
            AND prs2.is_active = 1
            AND (
              prs2.variant_id = ci.variant_id
              OR prs2.variant_id IS NULL
            )
          ORDER BY 
            CASE WHEN prs2.variant_id = ci.variant_id THEN 1 ELSE 2 END
          LIMIT 1
        )

        LEFT JOIN reward_rules rr 
        ON rr.reward_rule_id = prs.reward_rule_id
        AND rr.is_active = 1

        WHERE ci.user_id = ?  
        FOR UPDATE
        `,
        [userId],
      );

      if (!cartItems.length) throw new Error("CART_EMPTY");

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

      // =====================
      //  PRICING CALCULATION
      // =====================

      let productTotal = 0;
      let totalDiscount = 0;

      const itemPricingMap = {};

      for (const item of cartItems) {
        const salePrice = Number(item.sale_price);
        const quantity = Number(item.quantity);
        const rewardPercent = Number(item.reward_redemption_limit) || 0;

        const itemTotal = salePrice * quantity;

        const rewardDiscount = useRewards
          ? Math.round((itemTotal * rewardPercent) / 100)
          : 0;

        const finalItemTotal = itemTotal - rewardDiscount;

        productTotal += itemTotal;
        totalDiscount += rewardDiscount;

        itemPricingMap[item.variant_id] = {
          itemTotal,
          rewardDiscount,
          finalItemTotal,
        };
      }

      // =====================
      //  WALLET VALIDATION
      // =====================

      // if (useRewards && totalDiscount > 0) {
      //   const [[wallet]] = await conn.execute(
      //     `SELECT balance FROM customer_wallet WHERE user_id = ? LIMIT 1`,
      //     [userId],
      //   );

      //   const balance = wallet?.balance || 0;

      //   if (balance < totalDiscount) {
      //     throw new Error("INSUFFICIENT_REWARDS");
      //   }
      // }

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

        const group = vendorGroups[vendorId];

        group.items.push(item);

        group.totalWeightKg += item.quantity * Number(item.weight);
        group.totalAmount += item.quantity * Number(item.sale_price);

        group.length = Math.max(group.length, Number(item.length));
        group.breadth = Math.max(group.breadth, Number(item.breadth));
        group.height += Number(item.height) * item.quantity;
      }

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

        const weightGrams = Math.round(vendor.totalWeightKg * 1000);
        const length = Math.round(vendor.length);
        const breadth = Math.round(vendor.breadth);
        const height = Math.round(vendor.height);

        const serviceResponse = await xpressService.checkServiceability({
          origin: vendorAddress.pincode,
          destination: customerAddress.zipcode,
          payment_type: "prepaid",
          order_amount: vendor.totalAmount.toString(),
          weight: weightGrams.toString(),
          length: length.toString(),
          breadth: breadth.toString(),
          height: height.toString(),
        });

        if (!serviceResponse.status || !serviceResponse.data.length) {
          throw new Error("NOT_SERVICEABLE");
        }

        // const cheapest = serviceResponse.data
        //   .filter((o) => o.total_charges > 0)
        //   .sort((a, b) => a.total_charges - b.total_charges)[0];

        const validOptions = serviceResponse.data.filter(
          (o) => o.total_charges > 0,
        );

        if (!validOptions.length) {
          throw new Error("NOT_SERVICEABLE");
        }

        const selectedCourier = [...validOptions].sort(
          (a, b) => a.total_charges - b.total_charges,
        )[0];

        // =====================
        // DELIVERY DATE
        // =====================
        let expectedDeliveryDate = null;

        if (selectedCourier.estimated_delivery_date) {
          expectedDeliveryDate = new Date(
            selectedCourier.estimated_delivery_date,
          );
        } else if (selectedCourier.estimated_delivery_days) {
          const date = new Date();
          date.setDate(
            date.getDate() + Number(selectedCourier.estimated_delivery_days),
          );
          expectedDeliveryDate = date;
        }

        // fallback
        if (!expectedDeliveryDate) {
          const fallback = new Date();
          fallback.setDate(fallback.getDate() + 5);
          expectedDeliveryDate = fallback;
        }

        shippingResults.push({
          vendor_id: Number(vendorId),
          courier_id: selectedCourier.id || selectedCourier.courier_id || null,
          courier_name: selectedCourier.name,
          shipping_charges: Number(selectedCourier.total_charges),
          chargeable_weight: selectedCourier.chargeable_weight,
          package_weight: weightGrams,
          length,
          breadth,
          height,
          courier_options: JSON.stringify(serviceResponse.data),
          expected_delivery_date: expectedDeliveryDate,
        });
      }

      // 6 Calculate Totals
      const shippingTotal = shippingResults.reduce(
        (sum, s) => sum + s.shipping_charges,
        0,
      );

      const finalTotal = productTotal - totalDiscount + shippingTotal;

      // 7 Create order
      const orderRef = generateOrderRef();

      const [orderRes] = await conn.execute(
        `
        INSERT INTO eorders (user_id, company_id, total_amount,order_ref,address_id, product_total, reward_discount, reward_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          userId,
          companyId,
          finalTotal,
          orderRef,
          addressId,
          productTotal,
          totalDiscount,
          useRewards ? 1 : 0,
        ],
      );

      const orderId = orderRes.insertId;

      // 8 create vendor Order
      const vendorOrders = {};

      for (const vendorId in vendorGroups) {
        const vendor = vendorGroups[vendorId];

        const [vendorOrderRes] = await conn.execute(
          `
        INSERT INTO vendor_orders
        (order_id, vendor_id, vendor_total, shipping_status)
        VALUES (?, ?, ?, 'pending')
        `,
          [orderId, vendorId, vendor.totalAmount],
        );

        vendorOrders[vendorId] = vendorOrderRes.insertId;
      }

      // 9 Order items + stock deduction
      for (const item of cartItems) {
        const pricing = itemPricingMap[item.variant_id];
        const vendorOrderId = vendorOrders[item.vendor_id];

        await conn.execute(
          `
        INSERT INTO eorder_items
        (order_id, vendor_order_id, product_id, variant_id, quantity, price, reward_discount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            orderId,
            vendorOrderId,
            item.product_id,
            item.variant_id,
            item.quantity,
            item.sale_price,
            pricing.rewardDiscount,
          ],
        );

        const [updateRes] = await conn.execute(
          `
        UPDATE product_variants
        SET stock = stock - ?
        WHERE variant_id = ? AND stock >= ?
        `,
          [item.quantity, item.variant_id, item.quantity],
        );

        if (updateRes.affectedRows === 0) {
          throw new Error("STOCK_RACE_CONDITION");
        }
      }

      // 10 Shipment creation
      for (const shipment of shippingResults) {
        const vendorOrderId = vendorOrders[shipment.vendor_id];

        await conn.execute(
          `
        INSERT INTO order_shipments
        (order_id, vendor_order_id, vendor_id, courier_id, courier_name,
        shipping_charges, chargeable_weight,
        weight, length, breadth, height,
        courier_options,
        expected_delivery_date,
        shipping_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment')
        `,
          [
            orderId,
            vendorOrderId,
            shipment.vendor_id,
            shipment.courier_id,
            shipment.courier_name,
            shipment.shipping_charges,
            shipment.chargeable_weight,
            shipment.package_weight,
            shipment.length,
            shipment.breadth,
            shipment.height,
            shipment.courier_options,
            shipment.expected_delivery_date,
          ],
        );
      }

      // =====================
      //  WALLET DEDUCTION
      // =====================

      // if (useRewards && totalDiscount > 0) {
      //   await conn.execute(
      //     `
      //   UPDATE customer_wallet
      //   SET balance = balance - ?
      //   WHERE user_id = ?
      //   `,
      //     [totalDiscount, userId],
      //   );

      //   await conn.execute(
      //     `
      //   INSERT IGNORE INTO wallet_transactions
      //   (
      //     user_id,
      //     title,
      //     description,
      //     transaction_type,
      //     coins,
      //     category,
      //     reference_id
      //   )
      //   VALUES (?, ?, ?, 'debit', ?, 'order', ?)
      //   `,
      //     [
      //       userId,
      //       "Coins used for order",
      //       `Used ${totalDiscount} coins for order #${orderId}`,
      //       totalDiscount,
      //       orderId,
      //     ],
      //   );
      // }

      // 11 Invoice generation
      await generateInvoices(orderId, conn);

      // 12 Clear cart
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

  // Buy now items
  async buyNow({
    userId,
    productId,
    variantId,
    quantity,
    companyId = null,
    addressId,
    useRewards = true,
  }) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // 1 Fetch variant
      const [[variant]] = await conn.execute(
        `
      SELECT 
        v.sale_price,
        v.mrp,
        v.stock,
        v.weight,
        v.length,
        v.breadth,
        v.height,
        v.reward_redemption_limit,
        p.vendor_id
      FROM product_variants v
      JOIN eproducts p ON v.product_id = p.product_id
      WHERE v.variant_id = ? AND v.product_id = ?
      `,
        [variantId, productId],
      );

      if (!variant) {
        throw new Error("INVALID_VARIANT");
      }

      if (quantity > variant.stock) {
        throw new Error("OUT_OF_STOCK");
      }

      // 2 Get Customer address
      const customerAddress = await AddressModel.getAddressById(
        addressId,
        userId,
      );

      if (!customerAddress) {
        throw new Error("INVALID_ADDRESS");
      }

      // 3 Get vendor shipping address
      const [[vendorAddress]] = await conn.execute(
        `
      SELECT pincode
      FROM vendor_addresses
      WHERE vendor_id = ?
        AND type = 'shipping'
      LIMIT 1
      `,
        [variant.vendor_id],
      );

      if (!vendorAddress) {
        throw new Error("VENDOR_ADDRESS_MISSING");
      }

      const salePrice = Number(variant.sale_price) || 0;
      const rewardPercent = Number(variant.reward_redemption_limit) || 0;

      const productTotal = quantity * salePrice;

      const rewardDiscountAmount = useRewards
        ? Math.round((productTotal * rewardPercent) / 100)
        : 0;

      // =====================
      //   Wallet validation (only if rewards applied)
      // =====================
      // if (useRewards && rewardDiscountAmount > 0) {
      //   const [[wallet]] = await conn.execute(
      //     `SELECT balance FROM customer_wallet WHERE user_id = ? LIMIT 1`,
      //     [userId],
      //   );

      //   const balance = wallet?.balance || 0;

      //   if (balance < rewardDiscountAmount) {
      //     throw new Error("INSUFFICIENT_REWARDS");
      //   }
      // }

      const finalProductTotal = productTotal - rewardDiscountAmount;

      const weightGrams = Math.round(quantity * Number(variant.weight) * 1000);
      const length = Math.round(variant.length);
      const breadth = Math.round(variant.breadth);
      const height = Math.round(quantity * Number(variant.height));

      // 4 Serviceability
      const serviceResponse = await xpressService.checkServiceability({
        origin: vendorAddress.pincode,
        destination: customerAddress.zipcode,
        payment_type: "prepaid",
        order_amount: productTotal.toString(),
        weight: weightGrams.toString(),
        length: length.toString(),
        breadth: breadth.toString(),
        height: height.toString(),
      });

      if (!serviceResponse.status || !serviceResponse.data.length) {
        throw new Error("NOT_SERVICEABLE");
      }

      // const cheapest = serviceResponse.data
      //   .filter((o) => o.total_charges > 0)
      //   .sort((a, b) => a.total_charges - b.total_charges)[0];

      // const shippingCharge = Number(cheapest.total_charges);

      // =====================
      // SERVICEABILITY
      // =====================
      const validOptions = serviceResponse.data.filter(
        (o) => o.total_charges > 0,
      );

      if (!validOptions.length) {
        throw new Error("NOT_SERVICEABLE");
      }

      const selectedCourier = [...validOptions].sort(
        (a, b) => a.total_charges - b.total_charges,
      )[0];

      const shippingCharge = Number(selectedCourier.total_charges);

      // =====================
      // DELIVERY DATE (FIXED)
      // =====================
      let expectedDeliveryDate = null;

      if (selectedCourier.estimated_delivery_date) {
        expectedDeliveryDate = new Date(
          selectedCourier.estimated_delivery_date,
        );
      } else if (selectedCourier.estimated_delivery_days) {
        const date = new Date();
        date.setDate(
          date.getDate() + Number(selectedCourier.estimated_delivery_days),
        );
        expectedDeliveryDate = date;
      }

      // fallback
      if (!expectedDeliveryDate) {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 5);
        expectedDeliveryDate = fallback;
      }

      // =====================
      // FINAL TOTAL
      // =====================
      const finalTotal = finalProductTotal + shippingCharge;

      // 5 Create order

      const orderRef = generateOrderRef();

      const [orderRes] = await conn.execute(
        `
      INSERT INTO eorders (user_id, company_id, total_amount, order_ref,address_id, product_total, reward_discount, reward_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          userId,
          companyId,
          finalTotal,
          orderRef,
          addressId,
          productTotal,
          rewardDiscountAmount,
          useRewards ? 1 : 0,
        ],
      );

      const orderId = orderRes.insertId;

      //6 create vendor order
      const [vendorOrderRes] = await conn.execute(
        `
        INSERT INTO vendor_orders
        (order_id, vendor_id, vendor_total, shipping_status)
        VALUES (?, ?, ?, 'pending')
        `,
        [orderId, variant.vendor_id, productTotal],
      );

      const vendorOrderId = vendorOrderRes.insertId;

      // 7 Create order item
      await conn.execute(
        `
        INSERT INTO eorder_items
        (order_id, vendor_order_id, product_id, variant_id, quantity, price, reward_discount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          vendorOrderId,
          productId,
          variantId,
          quantity,
          variant.sale_price,
          rewardDiscountAmount,
        ],
      );

      // 8 Create shipment row
      await conn.execute(
        `
        INSERT INTO order_shipments
        (order_id, vendor_order_id, vendor_id, courier_id, courier_name,
        shipping_charges, chargeable_weight,
        weight, length, breadth, height,
        courier_options,
        expected_delivery_date,
        shipping_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment')
        `,
        [
          orderId,
          vendorOrderId,
          variant.vendor_id,
          cheapest.id,
          cheapest.name,
          shippingCharge,
          cheapest.chargeable_weight,
          weightGrams,
          length,
          breadth,
          height,
          JSON.stringify(serviceResponse.data),
          expectedDeliveryDate,
        ],
      );

      // =====================
      // WALLET DEDUCTION
      // =====================

      // if (useRewards && rewardDiscountAmount > 0) {
      //   // Deduct balance
      //   await conn.execute(
      //     `
      //     UPDATE customer_wallet
      //     SET balance = balance - ?
      //     WHERE user_id = ?
      //     `,
      //     [rewardDiscountAmount, userId],
      //   );

      //   // Insert wallet transaction
      //   await conn.execute(
      //     `
      //     INSERT INTO wallet_transactions
      //     (
      //       user_id,
      //       title,
      //       description,
      //       transaction_type,
      //       coins,
      //       category,
      //       reference_id
      //     )
      //     VALUES (?, ?, ?, 'debit', ?, 'order', ?)
      //     `,
      //     [
      //       userId,
      //       "Coins used for order",
      //       `Used ${rewardDiscountAmount} coins for order #${orderId}`,
      //       rewardDiscountAmount,
      //       orderId,
      //     ],
      //   );
      // }

      // 9 Invoice generation
      await generateInvoices(orderId, conn);

      // 10 Deduct stock
      const [updateRes] = await conn.execute(
        `
      UPDATE product_variants
      SET stock = stock - ?
      WHERE variant_id = ?
        AND stock >= ?
      `,
        [quantity, variantId, quantity],
      );

      if (updateRes.affectedRows === 0) {
        throw new Error("STOCK_RACE_CONDITION");
      }

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
  // async getCheckoutCart(userId, useRewards = true) {
  //   const [rows] = await db.execute(
  //     `
  //     SELECT
  //       ci.cart_item_id,
  //       ci.quantity,

  //       p.product_id,
  //       p.product_name,
  //       p.vendor_id,

  //       v.variant_id,
  //       v.mrp,
  //       v.sale_price,
  //       v.stock,
  //       v.reward_redemption_limit,
  //       v.weight,
  //       v.length,
  //       v.breadth,
  //       v.height,

  //       (ci.quantity * v.sale_price) AS item_total,

  //       GROUP_CONCAT(
  //         DISTINCT pi.image_url
  //         ORDER BY pi.sort_order ASC
  //       ) AS images

  //     FROM cart_items ci
  //     JOIN eproducts p ON ci.product_id = p.product_id
  //     JOIN product_variants v ON ci.variant_id = v.variant_id
  //     LEFT JOIN product_images pi ON p.product_id = pi.product_id

  //     WHERE ci.user_id = ?
  //     GROUP BY ci.cart_item_id
  //     `,
  //     [userId],
  //   );

  //   if (rows.length === 0) {
  //     throw new Error("CART_EMPTY");
  //   }

  //   let totalAmount = 0;
  //   let totalDiscount = 0;
  //   let payableAmount = 0;

  //   const items = rows.map((row) => {
  //     if (row.quantity > row.stock || row.stock <= 0) {
  //       throw new Error("OUT_OF_STOCK");
  //     }

  //     const salePrice = Number(row.sale_price) || 0;
  //     const quantity = Number(row.quantity) || 0;
  //     const rewardPercent = Number(row.reward_redemption_limit) || 0;

  //     const itemTotal = salePrice * quantity;

  //     const rewardDiscountAmount = useRewards
  //       ? Math.round((itemTotal * rewardPercent) / 100)
  //       : 0;

  //     const finalItemTotal = itemTotal - rewardDiscountAmount;

  //     totalAmount += itemTotal;
  //     totalDiscount += rewardDiscountAmount;
  //     payableAmount += finalItemTotal;

  //     return {
  //       cart_item_id: row.cart_item_id,
  //       product_id: row.product_id,
  //       variant_id: row.variant_id,
  //       title: row.product_name,
  //       image: row.images ? row.images.split(",")[0] : null,
  //       mrp: row.mrp,
  //       price: salePrice,
  //       quantity,
  //       perUnitDiscount: Number(row.mrp) - salePrice,
  //       item_total: itemTotal,
  //       points: rewardDiscountAmount,
  //       final_item_total: finalItemTotal,
  //       stock: row.stock,
  //     };
  //   });

  //   // =====================
  //   // WALLET VALIDATION (GLOBAL)
  //   // =====================

  //   // if (useRewards && totalDiscount > 0) {
  //   //   const [walletRows] = await db.execute(
  //   //     `SELECT balance FROM customer_wallet WHERE user_id = ? LIMIT 1`,
  //   //     [userId],
  //   //   );

  //   //   const balance = walletRows?.[0]?.balance || 0;

  //   //   if (balance < totalDiscount) {
  //   //     throw new Error("INSUFFICIENT_REWARDS");
  //   //   }
  //   // }

  //   // =====================
  //   // ADDRESS
  //   // =====================

  //   const [addressRows] = await db.execute(
  //     `SELECT zipcode FROM customer_addresses
  //       WHERE user_id = ?
  //       AND is_default = 1
  //       LIMIT 1`,
  //     [userId],
  //   );

  //   if (!addressRows.length) {
  //     throw new Error("INVALID_ADDRESS");
  //   }

  //   const destinationPincode = addressRows[0].zipcode;

  //   // Group by vendor
  //   const vendorGroups = {};

  //   for (const row of rows) {
  //     const vendorId = row.vendor_id;

  //     if (!vendorGroups[vendorId]) {
  //       vendorGroups[vendorId] = {
  //         totalWeightKg: 0,
  //         totalAmount: 0,
  //         length: 0,
  //         breadth: 0,
  //         height: 0,
  //       };
  //     }

  //     const group = vendorGroups[vendorId];

  //     group.totalWeightKg += row.quantity * Number(row.weight);
  //     group.totalAmount += row.quantity * Number(row.sale_price);

  //     group.length = Math.max(group.length, Number(row.length));
  //     group.breadth = Math.max(group.breadth, Number(row.breadth));
  //     group.height += Number(row.height) * row.quantity;
  //   }

  //   // =====================
  //   // SHIPPING
  //   // =====================
  //   let shippingTotal = 0;
  //   const shippingBreakdown = [];
  //   const eddList = [];

  //   for (const vendorId in vendorGroups) {
  //     const vendor = vendorGroups[vendorId];

  //     const [[vendorAddress]] = await db.execute(
  //       `SELECT pincode FROM vendor_addresses
  //    WHERE vendor_id = ?
  //      AND type = 'shipping'
  //    LIMIT 1`,
  //       [vendorId],
  //     );

  //     if (!vendorAddress) continue;

  //     const weightGrams = Math.round(vendor.totalWeightKg * 1000);

  //     const serviceResponse = await xpressService.checkServiceability({
  //       origin: vendorAddress.pincode,
  //       destination: destinationPincode,
  //       payment_type: "prepaid",
  //       order_amount: vendor.totalAmount.toString(),
  //       weight: weightGrams.toString(),
  //       length: Math.round(vendor.length).toString(),
  //       breadth: Math.round(vendor.breadth).toString(),
  //       height: Math.round(vendor.height).toString(),
  //     });

  //     if (!serviceResponse.status || !serviceResponse.data.length) continue;

  //     // Updated code
  //     const validOptions = serviceResponse.data.filter(
  //       (o) => o.total_charges > 0,
  //     );

  //     if (!validOptions.length) continue;

  //     // // Option 1: Cheapest
  //     // const cheapest = validOptions.sort(
  //     //   (a, b) => a.total_charges - b.total_charges,
  //     // )[0];

  //     // // Option 2: Fastest
  //     // const fastest = validOptions.sort(
  //     //   (a, b) =>
  //     //     (a.estimated_delivery_days || 999) -
  //     //     (b.estimated_delivery_days || 999),
  //     // )[0];

  //     // // strategy
  //     // const selectedCourier = cheapest; // or fastest
  //     // const shippingCharge = Number(selectedCourier.total_charges);
  //     // shippingTotal += shippingCharge;

  //     const selectedCourier = validOptions.sort(
  //       (a, b) => a.total_charges - b.total_charges,
  //     )[0];

  //     const shippingCharge = Number(selectedCourier.total_charges);
  //     shippingTotal += shippingCharge;

  //     // =====================
  //     // DELIVERY DATE
  //     // =====================

  //     let expectedDeliveryDate = null;

  //     if (selectedCourier.estimated_delivery_date) {
  //       expectedDeliveryDate = selectedCourier.estimated_delivery_date;
  //     } else if (selectedCourier.estimated_delivery_days) {
  //       const date = new Date();
  //       date.setDate(
  //         date.getDate() + Number(selectedCourier.estimated_delivery_days),
  //       );
  //       expectedDeliveryDate = date.toISOString();
  //     }

  //     if (expectedDeliveryDate) {
  //       eddList.push(new Date(expectedDeliveryDate));
  //     }

  //     shippingBreakdown.push({
  //       vendor_id: Number(vendorId),
  //       courier_name: selectedCourier.name,
  //       shipping_charges: shippingCharge,
  //       estimated_delivery_date: expectedDeliveryDate,
  //     });
  //   }

  //   // =====================
  //   // FINAL EDD (latest)
  //   // =====================
  //   let overallEDD = null;

  //   if (eddList.length) {
  //     overallEDD = eddList.sort((a, b) => b - a)[0];
  //   }

  //   return {
  //     items,
  //     productTotal: totalAmount,
  //     rewardUsed: useRewards,
  //     totalDiscount,
  //     shippingTotal,
  //     payableAmount: payableAmount + shippingTotal,
  //     shippingBreakdown,
  //     estimated_delivery_date: overallEDD,
  //   };
  // }

  async getCheckoutCart(userId, useRewards = true) {
    // ===============================
    // 1. WALLET
    // ===============================
    const [[wallet]] = await db.execute(
      `SELECT balance FROM customer_wallet WHERE user_id = ?`,
      [userId],
    );

    const walletBalance = Number(wallet?.balance || 0);

    // ===============================
    // 2. CART + REWARD JOIN (FIXED)
    // ===============================
    const [rows] = await db.execute(
      `
    SELECT 
      ci.cart_item_id,
      ci.quantity,

      p.product_id,
      p.product_name,
      p.vendor_id,

      v.variant_id,
      v.mrp,
      v.sale_price,
      v.stock,
      v.reward_redemption_limit,
      v.weight,
      v.length,
      v.breadth,
      v.height,

      prs.can_earn_reward,
      prs.can_redeem_reward,

      rr.reward_type,
      rr.reward_value,
      rr.max_reward,

      GROUP_CONCAT(DISTINCT pi.image_url ORDER BY pi.sort_order ASC) AS images

    FROM cart_items ci

    JOIN eproducts p ON ci.product_id = p.product_id
    JOIN product_variants v ON ci.variant_id = v.variant_id

    /*  CORRECT MAPPING */
    LEFT JOIN product_reward_settings prs 
      ON prs.id = (
        SELECT prs2.id
        FROM product_reward_settings prs2
        WHERE prs2.product_id = ci.product_id
          AND prs2.is_active = 1
          AND (
            prs2.variant_id = ci.variant_id
            OR prs2.variant_id IS NULL
          )
        ORDER BY 
          CASE WHEN prs2.variant_id = ci.variant_id THEN 1 ELSE 2 END
        LIMIT 1
      )

    LEFT JOIN reward_rules rr 
      ON rr.reward_rule_id = prs.reward_rule_id
      AND rr.is_active = 1

    LEFT JOIN product_images pi 
      ON p.product_id = pi.product_id

    WHERE ci.user_id = ?
    GROUP BY ci.cart_item_id
    `,
      [userId],
    );

    if (!rows.length) throw new Error("CART_EMPTY");

    // ===============================
    // 3. BUILD ITEMS
    // ===============================
    let totalAmount = 0;

    const items = rows.map((row) => {
      if (row.quantity > row.stock || row.stock <= 0) {
        throw new Error("OUT_OF_STOCK");
      }

      const itemTotal = row.sale_price * row.quantity;
      totalAmount += itemTotal;

      return {
        cart_item_id: row.cart_item_id,
        product_id: row.product_id,
        variant_id: row.variant_id,
        vendor_id: row.vendor_id,

        title: row.product_name,
        image: row.images ? row.images.split(",")[0] : null,

        mrp: row.mrp,
        price: row.sale_price,
        quantity: row.quantity,

        itemTotal,
        redeemable: 0,
        rewardEarn: 0,

        reward_redemption_limit: row.reward_redemption_limit,

        can_earn_reward: row.can_earn_reward,
        can_redeem_reward: row.can_redeem_reward,

        reward_type: row.reward_type,
        reward_value: row.reward_value,
        max_reward: row.max_reward,

        weight: row.weight,
        length: row.length,
        breadth: row.breadth,
        height: row.height,
      };
    });

    // ===============================
    // 4. REDEMPTION (WALLET)
    // ===============================
    let remainingWallet = useRewards ? walletBalance : 0;
    let totalRedeemed = 0;

    for (let item of items) {
      if (!useRewards) break;

      if (!item.can_redeem_reward || !item.reward_redemption_limit) continue;
      if (remainingWallet <= 0) break;

      const maxAllowed = Math.floor(
        (item.itemTotal * item.reward_redemption_limit) / 100,
      );

      const usable = Math.min(remainingWallet, maxAllowed, item.itemTotal);

      item.redeemable = usable;

      remainingWallet -= usable;
      totalRedeemed += usable;
    }

    totalRedeemed = Math.min(totalRedeemed, totalAmount);

    // ===============================
    // 5. EARNING (POST REDEMPTION)
    // ===============================
    let totalRewardEarn = 0;

    for (let item of items) {
      if (!item.can_earn_reward || !item.reward_type) continue;

      const effectiveAmount = item.itemTotal - item.redeemable;

      let reward = 0;

      if (item.reward_type === "fixed") {
        reward = item.reward_value;
      } else {
        reward = (effectiveAmount * item.reward_value) / 100;
      }

      if (item.max_reward) {
        reward = Math.min(reward, item.max_reward);
      }

      item.rewardEarn = Math.floor(reward);
      totalRewardEarn += item.rewardEarn;
    }

    // ===============================
    // 6. SHIPPING (UNCHANGED)
    // ===============================
    const [addressRows] = await db.execute(
      `SELECT zipcode FROM customer_addresses 
     WHERE user_id = ? AND is_default = 1 LIMIT 1`,
      [userId],
    );

    if (!addressRows.length) throw new Error("INVALID_ADDRESS");

    const destinationPincode = addressRows[0].zipcode;

    const vendorGroups = {};

    for (const item of items) {
      const vendorId = item.vendor_id;

      if (!vendorGroups[vendorId]) {
        vendorGroups[vendorId] = {
          totalWeightKg: 0,
          totalAmount: 0,
          length: 0,
          breadth: 0,
          height: 0,
        };
      }

      const group = vendorGroups[vendorId];

      group.totalWeightKg += item.quantity * Number(item.weight);
      group.totalAmount += item.itemTotal;

      group.length = Math.max(group.length, Number(item.length));
      group.breadth = Math.max(group.breadth, Number(item.breadth));
      group.height += Number(item.height) * item.quantity;
    }

    let shippingTotal = 0;
    const shippingBreakdown = [];
    const eddList = [];

    for (const vendorId in vendorGroups) {
      const vendor = vendorGroups[vendorId];

      const [[vendorAddress]] = await db.execute(
        `SELECT pincode FROM vendor_addresses 
       WHERE vendor_id = ? AND type = 'shipping' LIMIT 1`,
        [vendorId],
      );

      if (!vendorAddress) continue;

      const serviceResponse = await xpressService.checkServiceability({
        origin: vendorAddress.pincode,
        destination: destinationPincode,
        payment_type: "prepaid",
        order_amount: vendor.totalAmount.toString(),
        weight: Math.round(vendor.totalWeightKg * 1000).toString(),
        length: Math.round(vendor.length).toString(),
        breadth: Math.round(vendor.breadth).toString(),
        height: Math.round(vendor.height).toString(),
      });

      if (!serviceResponse.status || !serviceResponse.data.length) continue;

      const courier = serviceResponse.data
        .filter((o) => o.total_charges > 0)
        .sort((a, b) => a.total_charges - b.total_charges)[0];

      if (!courier) continue;

      shippingTotal += Number(courier.total_charges);

      const edd = courier.estimated_delivery_date
        ? new Date(courier.estimated_delivery_date)
        : new Date(Date.now() + courier.estimated_delivery_days * 86400000);

      eddList.push(edd);

      shippingBreakdown.push({
        vendor_id: Number(vendorId),
        courier_name: courier.name,
        shipping_charges: Number(courier.total_charges),
        estimated_delivery_date: edd,
      });
    }

    const overallEDD = eddList.length ? eddList.sort((a, b) => b - a)[0] : null;

    // ===============================
    // 7. FINAL TOTAL
    // ===============================
    const finalProductTotal = totalAmount - totalRedeemed;
    const payableAmount = finalProductTotal + shippingTotal;

    // ===============================
    // 8. RESPONSE
    // ===============================
    return {
      items,
      productTotal: totalAmount,

      wallet: {
        balance: walletBalance,
        used: totalRedeemed,
        remaining: remainingWallet,
      },

      reward: {
        earnCoins: totalRewardEarn,
        redeemCoins: totalRedeemed,
      },

      totalDiscount: totalRedeemed,
      shippingTotal,
      payableAmount,
      shippingBreakdown,
      estimated_delivery_date: overallEDD,
    };
  }

  // Get buy now checkout Details
  // async getBuyNowCheckout({
  //   productId,
  //   variantId,
  //   quantity,
  //   useRewards = true,
  //   userId,
  // }) {
  //   const [[row]] = await db.execute(
  //     `
  //   SELECT
  //     p.product_id,
  //     p.product_name,
  //     p.vendor_id,
  //     v.variant_id,
  //     v.mrp,
  //     v.sale_price,
  //     v.stock,
  //     v.reward_redemption_limit,
  //     v.weight,
  //     v.length,
  //     v.breadth,
  //     v.height,
  //     GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order ASC) AS images
  //   FROM product_variants v
  //   JOIN eproducts p ON v.product_id = p.product_id
  //   LEFT JOIN product_images pi ON p.product_id = pi.product_id
  //   WHERE v.variant_id = ? AND p.product_id = ?
  //   GROUP BY v.variant_id
  //   `,
  //     [variantId, productId],
  //   );

  //   if (!row) {
  //     throw new Error("INVALID_VARIANT");
  //   }

  //   if (quantity > row.stock || row.stock <= 0) {
  //     throw new Error("OUT_OF_STOCK");
  //   }

  //   const salePrice = Number(row.sale_price) || 0;
  //   const rewardPercent = Number(row.reward_redemption_limit) || 0;

  //   const itemTotal = salePrice * quantity;

  //   const rewardDiscountAmount = useRewards
  //     ? Math.round((itemTotal * rewardPercent) / 100)
  //     : 0;

  //   const finalItemTotal = itemTotal - rewardDiscountAmount;

  //   // =====================
  //   //   Wallet validation (only if rewards applied)
  //   // =====================

  //   // if (useRewards && rewardDiscountAmount > 0) {
  //   //   const [walletRows] = await db.execute(
  //   //     `SELECT balance FROM customer_wallet WHERE user_id = ? LIMIT 1`,
  //   //     [userId],
  //   //   );

  //   //   const walletBalance = walletRows?.[0]?.balance || 0;

  //   //   if (walletBalance < rewardDiscountAmount) {
  //   //     throw new Error("INSUFFICIENT_REWARDS");
  //   //   }
  //   // }

  //   // =====================
  //   // SHIPPING CALCULATION
  //   // =====================

  //   // Get address
  //   const [addressRows] = await db.execute(
  //     `SELECT zipcode FROM customer_addresses
  //    WHERE user_id = ?
  //      AND is_default = 1
  //    LIMIT 1`,
  //     [userId],
  //   );

  //   if (!addressRows.length) {
  //     throw new Error("INVALID_ADDRESS");
  //   }

  //   const destinationPincode = addressRows[0].zipcode;

  //   // Vendor shipping address
  //   const [[vendorAddress]] = await db.execute(
  //     `
  //   SELECT pincode
  //   FROM vendor_addresses
  //   WHERE vendor_id = ?
  //     AND type = 'shipping'
  //   LIMIT 1
  //   `,
  //     [row.vendor_id],
  //   );

  //   if (!vendorAddress) {
  //     throw new Error("VENDOR_ADDRESS_MISSING");
  //   }

  //   const weightGrams = Math.round(quantity * Number(row.weight) * 1000);
  //   const length = Math.round(row.length);
  //   const breadth = Math.round(row.breadth);
  //   const height = Math.round(quantity * Number(row.height));

  //   const serviceResponse = await xpressService.checkServiceability({
  //     origin: vendorAddress.pincode,
  //     destination: destinationPincode,
  //     payment_type: "prepaid",
  //     order_amount: itemTotal.toString(),
  //     weight: weightGrams.toString(),
  //     length: length.toString(),
  //     breadth: breadth.toString(),
  //     height: height.toString(),
  //   });

  //   if (!serviceResponse.status || !serviceResponse.data.length) {
  //     throw new Error("NOT_SERVICEABLE");
  //   }

  //   // const cheapest = serviceResponse.data
  //   //   .filter((o) => o.total_charges > 0)
  //   //   .sort((a, b) => a.total_charges - b.total_charges)[0];
  //   // const shippingCharge = Number(cheapest.total_charges);

  //   // =====================
  //   // SHIPPING + EDD
  //   // =====================
  //   const validOptions = serviceResponse.data.filter(
  //     (o) => o.total_charges > 0,
  //   );

  //   if (!validOptions.length) {
  //     throw new Error("NOT_SERVICEABLE");
  //   }

  //   // choose cheapest (can switch to fastest later)
  //   const selectedCourier = validOptions.sort(
  //     (a, b) => a.total_charges - b.total_charges,
  //   )[0];

  //   const shippingCharge = Number(selectedCourier.total_charges);

  //   // =====================
  //   // DELIVERY DATE
  //   // =====================
  //   let expectedDeliveryDate = null;

  //   if (selectedCourier.estimated_delivery_date) {
  //     expectedDeliveryDate = selectedCourier.estimated_delivery_date;
  //   } else if (selectedCourier.estimated_delivery_days) {
  //     const date = new Date();
  //     date.setDate(
  //       date.getDate() + Number(selectedCourier.estimated_delivery_days),
  //     );
  //     expectedDeliveryDate = date.toISOString().split("T")[0];
  //   }

  //   // =====================
  //   // FINAL PAYABLE
  //   // =====================
  //   const finalPayable = finalItemTotal + shippingCharge;

  //   return {
  //     item: {
  //       product_id: row.product_id,
  //       variant_id: row.variant_id,
  //       title: row.product_name,
  //       image: row.images ? row.images.split(",")[0] : null,
  //       price: salePrice,
  //       quantity,
  //       perUnitDiscount: Number(row.mrp - salePrice),
  //       item_total: itemTotal, //original
  //       points: rewardDiscountAmount, //new
  //       final_item_total: finalItemTotal, //after reward
  //       stock: row.stock,
  //     },
  //     productTotal: itemTotal,
  //     totalAmount: itemTotal,
  //     totalDiscount: rewardDiscountAmount,
  //     rewardUsed: useRewards,
  //     shippingTotal: shippingCharge,
  //     payableAmount: finalPayable,
  //     shippingBreakdown: [
  //       {
  //         vendor_id: row.vendor_id,
  //         courier_name: selectedCourier.name,
  //         shipping_charges: shippingCharge,
  //         estimated_delivery_date: expectedDeliveryDate,
  //       },
  //     ],
  //     estimated_delivery_date: expectedDeliveryDate,
  //   };
  // }

  async getBuyNowCheckout({
    productId,
    variantId,
    quantity,
    useRewards = true,
    userId,
  }) {
    // ===============================
    // 1. WALLET
    // ===============================
    const [[wallet]] = await db.execute(
      `SELECT balance FROM customer_wallet WHERE user_id = ?`,
      [userId],
    );

    const walletBalance = Number(wallet?.balance || 0);

    // ===============================
    // 2. PRODUCT + REWARD JOIN
    // ===============================
    const [[row]] = await db.execute(
      `
    SELECT 
      p.product_id,
      p.product_name,
      p.vendor_id,

      v.variant_id,
      v.mrp,
      v.sale_price,
      v.stock,
      v.reward_redemption_limit,
      v.weight,
      v.length,
      v.breadth,
      v.height,

      prs.can_earn_reward,
      prs.can_redeem_reward,

      rr.reward_type,
      rr.reward_value,
      rr.max_reward,

      GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order ASC) AS images

    FROM product_variants v
    JOIN eproducts p ON v.product_id = p.product_id

    /*  FIXED MAPPING */
    LEFT JOIN product_reward_settings prs 
      ON prs.id = (
        SELECT prs2.id
        FROM product_reward_settings prs2
        WHERE prs2.product_id = p.product_id
          AND prs2.is_active = 1
          AND (
            prs2.variant_id = v.variant_id
            OR prs2.variant_id IS NULL
          )
        ORDER BY 
          CASE WHEN prs2.variant_id = v.variant_id THEN 1 ELSE 2 END
        LIMIT 1
      )

    LEFT JOIN reward_rules rr 
      ON rr.reward_rule_id = prs.reward_rule_id
      AND rr.is_active = 1

    LEFT JOIN product_images pi 
      ON p.product_id = pi.product_id

    WHERE v.variant_id = ? AND p.product_id = ?
    GROUP BY v.variant_id
    `,
      [variantId, productId],
    );

    if (!row) throw new Error("INVALID_VARIANT");

    if (quantity > row.stock || row.stock <= 0) {
      throw new Error("OUT_OF_STOCK");
    }

    // ===============================
    // 3. BASE CALCULATION
    // ===============================
    const salePrice = Number(row.sale_price || 0);
    const itemTotal = salePrice * quantity;

    let redeemable = 0;
    let totalRedeemed = 0;

    // ===============================
    // 4. REDEMPTION
    // ===============================
    if (useRewards && row.can_redeem_reward && row.reward_redemption_limit) {
      const maxAllowed = Math.floor(
        (itemTotal * row.reward_redemption_limit) / 100,
      );

      redeemable = Math.min(walletBalance, maxAllowed, itemTotal);

      totalRedeemed = redeemable;
    }

    const finalItemTotal = itemTotal - totalRedeemed;

    // ===============================
    // 5. EARNING (POST REDEMPTION)
    // ===============================
    let rewardEarn = 0;

    if (row.can_earn_reward && row.reward_type) {
      const effectiveAmount = finalItemTotal;

      if (row.reward_type === "fixed") {
        rewardEarn = row.reward_value;
      } else {
        rewardEarn = (effectiveAmount * row.reward_value) / 100;
      }

      if (row.max_reward) {
        rewardEarn = Math.min(rewardEarn, row.max_reward);
      }

      rewardEarn = Math.floor(rewardEarn);
    }

    // ===============================
    // 6. SHIPPING (UNCHANGED)
    // ===============================
    const [addressRows] = await db.execute(
      `SELECT zipcode FROM customer_addresses
     WHERE user_id = ? AND is_default = 1 LIMIT 1`,
      [userId],
    );

    if (!addressRows.length) throw new Error("INVALID_ADDRESS");

    const destinationPincode = addressRows[0].zipcode;

    const [[vendorAddress]] = await db.execute(
      `SELECT pincode FROM vendor_addresses
     WHERE vendor_id = ? AND type = 'shipping' LIMIT 1`,
      [row.vendor_id],
    );

    if (!vendorAddress) throw new Error("VENDOR_ADDRESS_MISSING");

    const serviceResponse = await xpressService.checkServiceability({
      origin: vendorAddress.pincode,
      destination: destinationPincode,
      payment_type: "prepaid",
      order_amount: itemTotal.toString(),
      weight: Math.round(quantity * Number(row.weight) * 1000).toString(),
      length: Math.round(row.length).toString(),
      breadth: Math.round(row.breadth).toString(),
      height: Math.round(quantity * Number(row.height)).toString(),
    });

    if (!serviceResponse.status || !serviceResponse.data.length) {
      throw new Error("NOT_SERVICEABLE");
    }

    const courier = serviceResponse.data
      .filter((o) => o.total_charges > 0)
      .sort((a, b) => a.total_charges - b.total_charges)[0];

    if (!courier) throw new Error("NOT_SERVICEABLE");

    const shippingCharge = Number(courier.total_charges);

    let expectedDeliveryDate = null;

    if (courier.estimated_delivery_date) {
      expectedDeliveryDate = courier.estimated_delivery_date;
    } else if (courier.estimated_delivery_days) {
      const date = new Date();
      date.setDate(date.getDate() + Number(courier.estimated_delivery_days));
      expectedDeliveryDate = date.toISOString().split("T")[0];
    }

    // ===============================
    // 7. FINAL
    // ===============================
    const payableAmount = finalItemTotal + shippingCharge;

    return {
      item: {
        product_id: row.product_id,
        variant_id: row.variant_id,
        title: row.product_name,
        image: row.images ? row.images.split(",")[0] : null,

        price: salePrice,
        quantity,

        item_total: itemTotal,
        redeemable,
        final_item_total: finalItemTotal,
        rewardEarn,

        stock: row.stock,
      },

      wallet: {
        balance: walletBalance,
        used: totalRedeemed,
        remaining: walletBalance - totalRedeemed,
      },

      reward: {
        earnCoins: rewardEarn,
        redeemCoins: totalRedeemed,
      },

      productTotal: itemTotal,
      totalDiscount: totalRedeemed,
      shippingTotal: shippingCharge,
      payableAmount,

      shippingBreakdown: [
        {
          vendor_id: row.vendor_id,
          courier_name: courier.name,
          shipping_charges: shippingCharge,
          estimated_delivery_date: expectedDeliveryDate,
        },
      ],

      estimated_delivery_date: expectedDeliveryDate,
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
      oi.reward_discount,
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

    // 3 Fetch shipment dates
    const [shipments] = await db.execute(
      `
      SELECT 
        expected_delivery_date,
        delivered_at,
        shipping_charges
      FROM order_shipments
      WHERE order_id = ?
      `,
      [orderId],
    );

    let expectedDeliveryDate = null;
    let actualDeliveryDate = null;
    let deliveryFee = 0;
    let rewardDiscount = 0;

    if (shipments.length) {
      const expectedDates = shipments
        .map((s) => s.expected_delivery_date)
        .filter(Boolean)
        .map((d) => new Date(d));

      if (expectedDates.length) {
        expectedDeliveryDate = new Date(
          Math.max(...expectedDates.map((d) => d.getTime())),
        );
      }

      const deliveredDates = shipments
        .map((s) => s.delivered_at)
        .filter(Boolean)
        .map((d) => new Date(d));

      if (deliveredDates.length) {
        actualDeliveryDate = new Date(
          Math.max(...deliveredDates.map((d) => d.getTime())),
        );
      }

      // Shipping Fee
      deliveryFee = shipments.reduce(
        (sum, s) => sum + Number(s.shipping_charges || 0),
        0,
      );

      // rewardDiscount = items.reduce(
      //   (sum, i) => sum + Number(i.reward_discount || 0),
      //   0,
      // );
    }

    if (!expectedDeliveryDate) {
      const baseDate = new Date(order.created_at);

      const fallback = new Date(baseDate);
      fallback.setDate(baseDate.getDate() + 5);

      expectedDeliveryDate = fallback;
    }

    // static for Now
    const bagDiscount = 1032;

    return {
      orderId: order.order_id,
      orderDate: formatDate(new Date(order.created_at)),
      status: order.status,
      username: order.customer_name,
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

      deliveryDate: actualDeliveryDate
        ? formatDate(actualDeliveryDate)
        : formatDate(expectedDeliveryDate),

      expectedDeliveryDate: formatDate(expectedDeliveryDate),
      actualDeliveryDate: formatDate(actualDeliveryDate),
      rewardsEarned: 462,
    };
  }
}
module.exports = new CheckoutModel();
