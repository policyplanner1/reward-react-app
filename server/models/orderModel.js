const db = require("../config/database");

class OrderModel {
  // order Lists
  async getAdminOrderHistory({
    orderId = null,
    orderRef = null,
    status = null,
    userId = null,
    companyId = null,
    fromDate = null,
    toDate = null,
    page = 1,
    limit = 10,
  }) {
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (orderId) {
      conditions.push("o.order_id = ?");
      params.push(orderId);
    }

    if (orderRef) {
      conditions.push("o.order_ref = ?");
      params.push(orderRef);
    }

    if (status) {
      conditions.push("o.status = ?");
      params.push(status);
    }

    if (userId) {
      conditions.push("o.user_id = ?");
      params.push(userId);
    }

    if (companyId) {
      conditions.push("o.company_id = ?");
      params.push(companyId);
    }

    if (fromDate) {
      conditions.push("DATE(o.created_at) >= ?");
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push("DATE(o.created_at) <= ?");
      params.push(toDate);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [rows] = await db.execute(
      `
      SELECT
        o.order_id,
        o.order_ref,
        o.user_id,
        o.company_id,
        o.total_amount,
        o.status,
        o.created_at,

        COUNT(oi.order_item_id) AS item_count,

        s.shipping_status,
        s.awb_number,

        (
          SELECT p.product_name
          FROM eorder_items oii
          JOIN eproducts p ON oii.product_id = p.product_id
          WHERE oii.order_id = o.order_id
          LIMIT 1
        ) AS product_name,

        (
          SELECT p.brand_name
          FROM eorder_items oii
          JOIN eproducts p ON oii.product_id = p.product_id
          WHERE oii.order_id = o.order_id
          LIMIT 1
        ) AS brand_name,

        (
          SELECT pi.image_url
          FROM eorder_items oii
          JOIN product_images pi
            ON oii.product_id = pi.product_id
          WHERE oii.order_id = o.order_id
          ORDER BY pi.sort_order ASC
          LIMIT 1
        ) AS image

      FROM eorders o

      LEFT JOIN eorder_items oi 
        ON o.order_id = oi.order_id

      LEFT JOIN shipments s
        ON s.order_id = o.order_id

      ${whereClause}

      GROUP BY o.order_id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    );

    const [[{ total }]] = await db.execute(
      `
    SELECT COUNT(*) AS total
    FROM eorders o
    ${whereClause}
    `,
      params,
    );

    return {
      orders: rows,
      total,
    };
  }

  // order Details
  async getAdminOrderDetails(orderId) {
    // 1 Order + Customer + Company + Address
    const [[order]] = await db.execute(
      `
    SELECT
      o.order_id,
      o.order_ref,
      o.total_amount,
      o.status,
      o.created_at,

      cu.user_id,
      cu.name AS customer_name,
      cu.email AS customer_email,
      cu.phone AS customer_phone,

      comp.company_id,
      comp.company_name,

      ca.address_type,
      ca.address1,
      ca.address2,
      ca.city,
      ca.zipcode,
      ca.landmark,
      ca.contact_name,
      ca.contact_phone,

      s.state_name,
      c.country_name

    FROM eorders o

    LEFT JOIN customer cu
      ON o.user_id = cu.user_id

    LEFT JOIN companies comp
      ON o.company_id = comp.company_id

    LEFT JOIN customer_addresses ca
      ON o.address_id = ca.address_id

    LEFT JOIN states s
      ON ca.state_id = s.state_id

    LEFT JOIN countries c
      ON ca.country_id = c.country_id

    WHERE o.order_id = ?
    `,
      [orderId],
    );

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    // 2 Order Items
    const [items] = await db.execute(
      `
    SELECT
      oi.order_item_id,
      oi.product_id,
      oi.variant_id,
      oi.quantity,
      oi.price,

      p.product_name,
      p.brand_name,

      v.variant_attributes,

      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.product_id
        ORDER BY pi.sort_order ASC
        LIMIT 1
      ) AS image

    FROM eorder_items oi
    JOIN eproducts p 
      ON oi.product_id = p.product_id
    JOIN product_variants v
      ON oi.variant_id = v.variant_id

    WHERE oi.order_id = ?
    `,
      [orderId],
    );

    const processedItems = items.map((i) => {
      let attributes = {};

      if (i.variant_attributes) {
        try {
          attributes = JSON.parse(i.variant_attributes);
        } catch {
          attributes = {};
        }
      }

      return {
        order_item_id: i.order_item_id,
        product_id: i.product_id,
        variant_id: i.variant_id,
        product_name: i.product_name,
        brand_name: i.brand_name,
        image: i.image,
        attributes,
        quantity: i.quantity,
        price: i.price,
        item_total: i.quantity * i.price,
      };
    });

    const itemTotal = processedItems.reduce((sum, i) => sum + i.item_total, 0);

    return {
      order: {
        order_id: order.order_id,
        order_ref: order.order_ref,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
      },

      customer: {
        user_id: order.user_id,
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      },

      company: order.company_id
        ? {
            company_id: order.company_id,
            company_name: order.company_name,
          }
        : null,

      address: {
        type: order.address_type,
        name: order.contact_name,
        phone: order.contact_phone,
        line1: order.address1,
        line2: order.address2,
        city: order.city,
        state: order.state_name,
        country: order.country_name,
        zipcode: order.zipcode,
        landmark: order.landmark,
      },

      items: processedItems,

      summary: {
        item_total: itemTotal,
        order_total: order.total_amount,
      },
    };
  }
}

module.exports = new OrderModel();
