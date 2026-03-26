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
          p.vendor_id
        FROM cart_items ci
        JOIN product_variants v ON ci.variant_id = v.variant_id
        JOIN eproducts p ON v.product_id = p.product_id
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

        const cheapest = serviceResponse.data
          .filter((o) => o.total_charges > 0)
          .sort((a, b) => a.total_charges - b.total_charges)[0];

        shippingResults.push({
          vendor_id: Number(vendorId),
          courier_id: cheapest.id,
          courier_name: cheapest.name,
          shipping_charges: Number(cheapest.total_charges),
          chargeable_weight: cheapest.chargeable_weight,
          package_weight: weightGrams,
          length,
          breadth,
          height,
          courier_options: JSON.stringify(serviceResponse.data),
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
        shipping_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment')
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

      const cheapest = serviceResponse.data
        .filter((o) => o.total_charges > 0)
        .sort((a, b) => a.total_charges - b.total_charges)[0];

      const shippingCharge = Number(cheapest.total_charges);

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
        shipping_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment')
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
  async getCheckoutCart(userId, useRewards = true) {
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
      if (row.quantity > row.stock || row.stock <= 0) {
        throw new Error("OUT_OF_STOCK");
      }

      const salePrice = Number(row.sale_price) || 0;
      const quantity = Number(row.quantity) || 0;
      const rewardPercent = Number(row.reward_redemption_limit) || 0;

      const itemTotal = salePrice * quantity;

      const rewardDiscountAmount = useRewards
        ? Math.round((itemTotal * rewardPercent) / 100)
        : 0;

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

    // =====================
    // WALLET VALIDATION (GLOBAL)
    // =====================

    // if (useRewards && totalDiscount > 0) {
    //   const [walletRows] = await db.execute(
    //     `SELECT balance FROM customer_wallet WHERE user_id = ? LIMIT 1`,
    //     [userId],
    //   );

    //   const balance = walletRows?.[0]?.balance || 0;

    //   if (balance < totalDiscount) {
    //     throw new Error("INSUFFICIENT_REWARDS");
    //   }
    // }

    // =====================
    // ADDRESS
    // =====================

    const [addressRows] = await db.execute(
      `SELECT zipcode FROM customer_addresses
        WHERE user_id = ?
        AND is_default = 1
        LIMIT 1`,
      [userId],
    );

    if (!addressRows.length) {
      throw new Error("INVALID_ADDRESS");
    }

    const destinationPincode = addressRows[0].zipcode;

    // Group by vendor
    const vendorGroups = {};

    for (const row of rows) {
      const vendorId = row.vendor_id;

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

      group.totalWeightKg += row.quantity * Number(row.weight);
      group.totalAmount += row.quantity * Number(row.sale_price);

      group.length = Math.max(group.length, Number(row.length));
      group.breadth = Math.max(group.breadth, Number(row.breadth));
      group.height += Number(row.height) * row.quantity;
    }

    // =====================
    // SHIPPING
    // =====================
    let shippingTotal = 0;
    const shippingBreakdown = [];
    const eddList = [];

    for (const vendorId in vendorGroups) {
      const vendor = vendorGroups[vendorId];

      const [[vendorAddress]] = await db.execute(
        `SELECT pincode FROM vendor_addresses
     WHERE vendor_id = ?
       AND type = 'shipping'
     LIMIT 1`,
        [vendorId],
      );

      if (!vendorAddress) continue;

      const weightGrams = Math.round(vendor.totalWeightKg * 1000);

      const serviceResponse = await xpressService.checkServiceability({
        origin: vendorAddress.pincode,
        destination: destinationPincode,
        payment_type: "prepaid",
        order_amount: vendor.totalAmount.toString(),
        weight: weightGrams.toString(),
        length: Math.round(vendor.length).toString(),
        breadth: Math.round(vendor.breadth).toString(),
        height: Math.round(vendor.height).toString(),
      });

      if (!serviceResponse.status || !serviceResponse.data.length) continue;

      // Updated code
      const validOptions = serviceResponse.data.filter(
        (o) => o.total_charges > 0,
      );

      if (!validOptions.length) continue;

      // // Option 1: Cheapest
      // const cheapest = validOptions.sort(
      //   (a, b) => a.total_charges - b.total_charges,
      // )[0];

      // // Option 2: Fastest
      // const fastest = validOptions.sort(
      //   (a, b) =>
      //     (a.estimated_delivery_days || 999) -
      //     (b.estimated_delivery_days || 999),
      // )[0];

      // // strategy
      // const selectedCourier = cheapest; // or fastest
      // const shippingCharge = Number(selectedCourier.total_charges);
      // shippingTotal += shippingCharge;

      const selectedCourier = validOptions.sort(
        (a, b) => a.total_charges - b.total_charges,
      )[0];

      const shippingCharge = Number(selectedCourier.total_charges);
      shippingTotal += shippingCharge;

      // =====================
      // DELIVERY DATE
      // =====================

      let expectedDeliveryDate = null;

      if (selectedCourier.estimated_delivery_date) {
        expectedDeliveryDate = selectedCourier.estimated_delivery_date;
      } else if (selectedCourier.estimated_delivery_days) {
        const date = new Date();
        date.setDate(
          date.getDate() + Number(selectedCourier.estimated_delivery_days),
        );
        expectedDeliveryDate = date.toISOString();
      }

      if (expectedDeliveryDate) {
        eddList.push(new Date(expectedDeliveryDate));
      }

      shippingBreakdown.push({
        vendor_id: Number(vendorId),
        courier_name: selectedCourier.name,
        shipping_charges: shippingCharge,
        estimated_delivery_date: expectedDeliveryDate,
      });
    }

    // =====================
    // FINAL EDD (latest)
    // =====================
    let overallEDD = null;

    if (eddList.length) {
      overallEDD = eddList.sort((a, b) => b - a)[0];
    }

    return {
      items,
      productTotal: totalAmount,
      rewardUsed: useRewards,
      totalDiscount,
      shippingTotal,
      payableAmount: payableAmount + shippingTotal,
      shippingBreakdown,
      estimated_delivery_date: overallEDD,
    };
  }

  // Get buy now checkout Details
  async getBuyNowCheckout({
    productId,
    variantId,
    quantity,
    useRewards = true,
    userId,
  }) {
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

    if (quantity > row.stock || row.stock <= 0) {
      throw new Error("OUT_OF_STOCK");
    }

    const salePrice = Number(row.sale_price) || 0;
    const rewardPercent = Number(row.reward_redemption_limit) || 0;

    const itemTotal = salePrice * quantity;

    const rewardDiscountAmount = useRewards
      ? Math.round((itemTotal * rewardPercent) / 100)
      : 0;

    const finalItemTotal = itemTotal - rewardDiscountAmount;

    // =====================
    //   Wallet validation (only if rewards applied)
    // =====================

    // if (useRewards && rewardDiscountAmount > 0) {
    //   const [walletRows] = await db.execute(
    //     `SELECT balance FROM customer_wallet WHERE user_id = ? LIMIT 1`,
    //     [userId],
    //   );

    //   const walletBalance = walletRows?.[0]?.balance || 0;

    //   if (walletBalance < rewardDiscountAmount) {
    //     throw new Error("INSUFFICIENT_REWARDS");
    //   }
    // }

    // =====================
    // SHIPPING CALCULATION
    // =====================

    // Get address
    const [addressRows] = await db.execute(
      `SELECT zipcode FROM customer_addresses
     WHERE user_id = ?
       AND is_default = 1
     LIMIT 1`,
      [userId],
    );

    if (!addressRows.length) {
      throw new Error("INVALID_ADDRESS");
    }

    const destinationPincode = addressRows[0].zipcode;

    // Vendor shipping address
    const [[vendorAddress]] = await db.execute(
      `
    SELECT pincode
    FROM vendor_addresses
    WHERE vendor_id = ?
      AND type = 'shipping'
    LIMIT 1
    `,
      [row.vendor_id],
    );

    if (!vendorAddress) {
      throw new Error("VENDOR_ADDRESS_MISSING");
    }

    const weightGrams = Math.round(quantity * Number(row.weight) * 1000);
    const length = Math.round(row.length);
    const breadth = Math.round(row.breadth);
    const height = Math.round(quantity * Number(row.height));

    const serviceResponse = await xpressService.checkServiceability({
      origin: vendorAddress.pincode,
      destination: destinationPincode,
      payment_type: "prepaid",
      order_amount: itemTotal.toString(),
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
    // SHIPPING + EDD
    // =====================
    const validOptions = serviceResponse.data.filter(
      (o) => o.total_charges > 0,
    );

    if (!validOptions.length) {
      throw new Error("NOT_SERVICEABLE");
    }

    // choose cheapest (can switch to fastest later)
    const selectedCourier = validOptions.sort(
      (a, b) => a.total_charges - b.total_charges,
    )[0];

    const shippingCharge = Number(selectedCourier.total_charges);

    // =====================
    // DELIVERY DATE
    // =====================
    let expectedDeliveryDate = null;

    if (selectedCourier.estimated_delivery_date) {
      expectedDeliveryDate = selectedCourier.estimated_delivery_date;
    } else if (selectedCourier.estimated_delivery_days) {
      const date = new Date();
      date.setDate(
        date.getDate() + Number(selectedCourier.estimated_delivery_days),
      );
      expectedDeliveryDate = date.toISOString().split("T")[0];
    }

    // =====================
    // FINAL PAYABLE
    // =====================
    const finalPayable = finalItemTotal + shippingCharge;

    return {
      item: {
        product_id: row.product_id,
        variant_id: row.variant_id,
        title: row.product_name,
        image: row.images ? row.images.split(",")[0] : null,
        price: salePrice,
        quantity,
        perUnitDiscount: Number(row.mrp - salePrice),
        item_total: itemTotal, //original
        points: rewardDiscountAmount, //new
        final_item_total: finalItemTotal, //after reward
        stock: row.stock,
      },
      productTotal: itemTotal,
      totalAmount: itemTotal,
      totalDiscount: rewardDiscountAmount,
      rewardUsed: useRewards,
      shippingTotal: shippingCharge,
      payableAmount: finalPayable,
      shippingBreakdown: [
        {
          vendor_id: row.vendor_id,
          courier_name: selectedCourier.name,
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
