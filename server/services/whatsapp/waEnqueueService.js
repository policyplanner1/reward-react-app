const pool = require("../../config/db"); // use your db connection path

function normalizePhone(phone) {
  if (!phone) return null;
  let p = String(phone).trim();
  p = p.replace(/\s+/g, "");
  if (p.startsWith("0")) p = p.slice(1);
  if (!p.startsWith("+91")) {
    if (p.length === 10) p = "+91" + p;
    else if (!p.startsWith("+")) p = "+91" + p;
  }
  return p;
}

function matchCondition(condition, ctx) {
  // condition_json like {status:"shipped"} should match ctx.status
  if (!condition) return true;
  for (const k of Object.keys(condition)) {
    if (String(ctx[k] ?? "") !== String(condition[k])) return false;
  }
  return true;
}

async function enqueueWhatsApp({ eventName, ctx }) {
  // ctx must include: order_id, company_id, phone, etc.
  const phone_full = normalizePhone(ctx.phone);
  if (!phone_full) return { ok: false, reason: "MISSING_PHONE" };

  // company rules first, then global
  const [rules] = await pool.query(
    `
    SELECT * FROM wa_rules
    WHERE event_name = ?
      AND is_active = 1
      AND (company_id = ? OR company_id IS NULL)
    ORDER BY (company_id IS NULL) ASC, priority ASC
    `,
    [eventName, ctx.company_id ?? null]
  );

  let picked = null;
  for (const r of rules) {
    const cond = typeof r.condition_json === "string" ? JSON.parse(r.condition_json) : r.condition_json;
    if (matchCondition(cond, ctx)) { picked = r; break; }
  }
  if (!picked) return { ok: false, reason: "NO_RULE" };

  // template lookup (company override first)
  const [tplRows] = await pool.query(
    `
    SELECT * FROM wa_templates
    WHERE template_key = ?
      AND is_active = 1
      AND (company_id = ? OR company_id IS NULL)
    ORDER BY (company_id IS NULL) ASC
    LIMIT 1
    `,
    [picked.template_key, ctx.company_id ?? null]
  );
  if (!tplRows.length) return { ok: false, reason: "TEMPLATE_NOT_FOUND" };

  const tpl = tplRows[0];

  // Build body values (simple default mapping for now)
  // You can change this later using a wa_template_vars table (as in your doc).
  const bodyValues = buildBodyValues(picked.template_key, ctx);

  const idem_key = `${ctx.company_id || "GLOBAL"}|${eventName}|${picked.template_key}|${phone_full}|${ctx.order_id}`;

  try {
    await pool.query(
      `
      INSERT INTO wa_queue (company_id, event_name, template_key, phone_full, body_values, order_id, idem_key, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `,
      [
        ctx.company_id ?? null,
        eventName,
        picked.template_key,
        phone_full,
        JSON.stringify(bodyValues),
        ctx.order_id,
        idem_key
      ]
    );
    return { ok: true, queued: true, template_key: picked.template_key };
  } catch (e) {
    if (String(e.message || "").includes("uq_idem") || String(e.code || "") === "ER_DUP_ENTRY") {
      return { ok: true, queued: false, duplicate: true };
    }
    throw e;
  }
}

function buildBodyValues(templateKey, ctx) {
  // Minimal values you likely need for e-commerce templates
  // Adjust to match your Interakt template placeholders order.
  switch (templateKey) {
    case "ORDER_CREATED":
      return [ctx.customer_name || "Customer", String(ctx.order_id), String(ctx.total_amount || "")];
    case "ORDER_SHIPPED":
      return [ctx.customer_name || "Customer", String(ctx.order_id), String(ctx.total_amount || ""), ctx.tracking_link || "NA"];
    case "ORDER_DELIVERED":
      return [ctx.customer_name || "Customer", String(ctx.order_id), String(ctx.total_amount || "")];
    case "ORDER_CANCELLED":
      return [ctx.customer_name || "Customer", String(ctx.order_id), String(ctx.total_amount || "")];
    default:
      return [String(ctx.order_id)];
  }
}

module.exports = { enqueueWhatsApp };
