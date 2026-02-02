const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const pool = require("../../config/database");
const { sendTemplateMessage } = require("./interaktService");

const MAX_RETRY = Number(process.env.WA_MAX_RETRY || 3);
const RETRY_DELAY_MINUTES = Number(process.env.WA_RETRY_DELAY_MINUTES || 2);

console.log("BASE_URL:", process.env.INTERAKT_BASE_URL);
console.log("API_KEY:", process.env.INTERAKT_API_KEY ? "✅ loaded" : "❌ missing");

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toErrorString(e) {
  // store useful axios/interakt errors in DB
  const status = e?.response?.status;
  const data = e?.response?.data;

  if (status || data) {
    let d = "";
    try {
      d = typeof data === "string" ? data : JSON.stringify(data);
    } catch {
      d = String(data);
    }
    return `HTTP ${status || ""} ${d}`.trim();
  }

  return String(e?.message || e);
}

async function pickJob() {
  const [rows] = await pool.query(
    `
    SELECT * FROM wa_queue
    WHERE status = 'PENDING'
      AND scheduled_at <= NOW()
    ORDER BY id ASC
    LIMIT 1
    `
  );

  if (!rows.length) return null;

  const job = rows[0];

  // lock atomically
  const [res] = await pool.query(
    `
    UPDATE wa_queue
    SET status='PROCESSING', locked_at=NOW()
    WHERE id=? AND status='PENDING'
    `,
    [job.id]
  );

  if (res.affectedRows !== 1) return null;
  return job;
}

async function runOnce() {
  const job = await pickJob();
  if (!job) return false;

  try {
    // fetch template for this job
    const [tplRows] = await pool.query(
      `
      SELECT * FROM wa_templates
      WHERE template_key = ?
        AND is_active = 1
        AND (company_id = ? OR company_id IS NULL)
      ORDER BY (company_id IS NULL) ASC
      LIMIT 1
      `,
      [job.template_key, job.company_id]
    );

    if (!tplRows.length) throw new Error("Template not found for job");

    const tpl = tplRows[0];

    // parse body_values (required)
    const bodyValues = safeJsonParse(job.body_values, null);
    if (!Array.isArray(bodyValues)) {
      throw new Error("Invalid body_values JSON in wa_queue");
    }

    // parse button_values (optional)
    // if column/value missing, keep null
    const buttonValues = safeJsonParse(job.button_values, null);

    // send message
    await sendTemplateMessage({
      phone: job.phone_full,
      templateName: tpl.interakt_name,
      languageCode: tpl.language_code || "en",
      bodyValues,
      buttonValues, // ✅ will be null if not present
    });

    // mark sent
    await pool.query(
      `
      UPDATE wa_queue
      SET status='SENT',
          sent_at=NOW(),
          last_error=NULL,
          locked_at=NULL
      WHERE id=?
      `,
      [job.id]
    );
  } catch (e) {
    const msg = toErrorString(e);

    // increment retry count
    const [curRows] = await pool.query(
      `SELECT retry_count FROM wa_queue WHERE id=?`,
      [job.id]
    );
    const retryCount = (curRows[0]?.retry_count ?? 0) + 1;

    if (retryCount >= MAX_RETRY) {
      await pool.query(
        `
        UPDATE wa_queue
        SET status='FAILED',
            retry_count=?,
            last_error=?,
            locked_at=NULL
        WHERE id=?
        `,
        [retryCount, msg, job.id]
      );
    } else {
      await pool.query(
        `
        UPDATE wa_queue
        SET status='PENDING',
            retry_count=?,
            last_error=?,
            scheduled_at=DATE_ADD(NOW(), INTERVAL ? MINUTE),
            locked_at=NULL
        WHERE id=?
        `,
        [retryCount, msg, RETRY_DELAY_MINUTES, job.id]
      );
    }
  }

  return true;
}

async function start() {
  while (true) {
    const did = await runOnce();
    await new Promise((r) => setTimeout(r, did ? 300 : 1500));
  }
}

start().catch((e) => {
  console.error("WA Worker fatal:", e);
  setTimeout(() => {
    console.log("🔁 Restarting WA Worker...");
    start().catch((err) => console.error("WA Worker restart failed:", err));
  }, 3000);
});
