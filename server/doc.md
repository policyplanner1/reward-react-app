// After shipment cancellation
const [remaining] = await db.query(
  `SELECT COUNT(*) AS cnt
   FROM order_shipments
   WHERE order_id = ?
     AND shipping_status NOT IN ('cancelled','rto')`,
  [orderId]
);

if (remaining[0].cnt === 0) {
  // All shipments are cancelled → cancel order
  await db.query(
    `UPDATE eorders SET status = 'cancelled'
     WHERE order_id = ?`,
    [orderId]
  );

  // Restore stock
  await db.query(
    `UPDATE product_variants pv
     JOIN eorder_items oi ON pv.variant_id = oi.variant_id
     SET pv.stock = pv.stock + oi.quantity
     WHERE oi.order_id = ?`,
    [orderId]
  );

  // Refund payment if already paid
  // You can reuse your existing refundPayment method
  await PaymentController.refundPayment({ body: { orderId } }, { /* fake res */ });
}










<!--  -->
🔥 What You Should NOT Do

Do NOT:
Auto refund on RTO immediately
Auto restore stock on RTO immediately
Wait until parcel physically returns.

===========================================
Admin NDR dashboard + reattempt API
RTO warehouse confirmation flow
Auto notification system for NDR/RTO




<!--  -->