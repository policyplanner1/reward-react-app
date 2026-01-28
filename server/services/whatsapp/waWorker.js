require("dotenv").config();
const pool = require("../../config/database"); // adjust path
const { sendTemplateMessage } = require("./interaktService");

const MAX_RETRY = Number(process.env.WA_MAX_RETRY || 3);

async function pickJob() {
  // lock one job safely
  const [rows] = await pool.query(
    `
    SELECT * FROM wa_queue
    WHERE status = 'PENDING' AND scheduled_at <= NOW()
    ORDER BY id ASC
    LIMIT 1
    `
  );
  if (!rows.length) return null;

  const job = rows[0];

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
    const [tplRows] = await pool.query(
      `
      SELECT * FROM wa_templates
      WHERE template_key = ?
        AND is_active=1
        AND (company_id = ? OR company_id IS NULL)
      ORDER BY (company_id IS NULL) ASC
      LIMIT 1
      `,
      [job.template_key, job.company_id]
    );

    if (!tplRows.length) throw new Error("Template not found for job");

    const tpl = tplRows[0];
    const bodyValues = typeof job.body_values === "string" ? JSON.parse(job.body_values) : job.body_values;

    await sendTemplateMessage({
      phone: job.phone_full,
      templateName: tpl.interakt_name,
      languageCode: tpl.language_code || "en",
      bodyValues
    });

    await pool.query(
      `UPDATE wa_queue SET status='SENT', sent_at=NOW(), last_error=NULL WHERE id=?`,
      [job.id]
    );
  } catch (e) {
    const msg = String(e.message || e);

    const [curRows] = await pool.query(`SELECT retry_count FROM wa_queue WHERE id=?`, [job.id]);
    const retryCount = (curRows[0]?.retry_count ?? 0) + 1;

    if (retryCount >= MAX_RETRY) {
      await pool.query(
        `UPDATE wa_queue SET status='FAILED', retry_count=?, last_error=? WHERE id=?`,
        [retryCount, msg, job.id]
      );
    } else {
      await pool.query(
        `UPDATE wa_queue SET status='PENDING', retry_count=?, last_error=?, scheduled_at=DATE_ADD(NOW(), INTERVAL 2 MINUTE) WHERE id=?`,
        [retryCount, msg, job.id]
      );
    }
  }

  return true;
}

async function start() {
  // simple loop
  // (Use PM2 to keep it running)
  while (true) {
    const did = await runOnce();
    await new Promise((r) => setTimeout(r, did ? 300 : 1500));
  }
}

start().catch((e) => {
  console.error("WA Worker fatal:", e);
  process.exit(1);
});
  