const db = require("../config/database");

class flashController {
  // create flash sale
  async createFlashSale(req, res) {
    try {
      const { title, start_at, end_at } = req.body;
      console.log(req,"Req")

      // Multer file
      const banner_image = req.file ? req.file.filename : null;

      if (!banner_image) {
        return res.status(400).json({
          success: false,
          message: "Banner image is required",
        });
      }

      const [result] = await db.query(
        `INSERT INTO flash_sales
       (title, banner_image, start_at, end_at, status)
       VALUES (?, ?, ?, ?, 'draft')`,
        [title, banner_image, start_at, end_at],
      );

      res.json({
        success: true,
        flash_id: result.insertId,
        message: "Flash sale created",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // update Flash sale
  async updateFlashSale(req, res) {
    try {
      const { id } = req.params;
      const { title, start_at, end_at } = req.body;

      const banner_image = req.file ? req.file.filename : null;

      await db.query(
        `UPDATE flash_sales
       SET title=?,
           start_at=?,
           end_at=?,
           banner_image = COALESCE(?, banner_image)
       WHERE flash_id=?`,
        [title, start_at, end_at, banner_image, id],
      );

      res.json({
        success: true,
        flash_id: id,
        message: "Flash sale updated",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // add Product to Flash sale
  async addItems(req, res) {
    try {
      const flash_sale_id = req.params.id;
      const items = req.body.items;

      const values = items.map((i) => [
        flash_sale_id,
        i.product_id,
        i.variant_id || null,
        i.offer_price,
        i.max_qty || null,
      ]);

      await db.query(
        `INSERT INTO flash_sale_items
      (flash_sale_id, product_id, variant_id, offer_price, max_qty)
      VALUES ?`,
        [values],
      );

      res.json({ success: true, message: "Items added to flash sale" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // activate flash sale
  async activate(req, res) {
    try {
      const id = req.params.id;

      await db.query(
        `UPDATE flash_sales SET status = 'active' WHERE flash_sale_id = ?`,
        [id],
      );

      res.json({ success: true, message: "Flash sale activated" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  //   fetch active flash sale products
  async getActiveProducts(req, res) {
    try {
      const [rows] = await db.query(`
      SELECT
        fs.flash_sale_id,
        ep.product_id,
        pv.variant_id,
        ep.product_name,
        pv.variant_attributes,
        pv.mrp,
        pv.sale_price AS original_price,
        fsi.offer_price,
        fs.start_at,
        fs.end_at
      FROM flash_sales fs
      JOIN flash_sale_items fsi
        ON fs.flash_sale_id = fsi.flash_sale_id
      JOIN eproducts ep
        ON ep.product_id = fsi.product_id
      LEFT JOIN product_variants pv
        ON (
            (fsi.variant_id IS NULL AND pv.product_id = ep.product_id)
            OR
            (fsi.variant_id = pv.variant_id)
        )
      WHERE
        fs.status = 'active'
        AND NOW() BETWEEN fs.start_at AND fs.end_at
        AND ep.status = 'approved'
        AND ep.is_visible = 1
        AND pv.is_visible = 1
    `);

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new flashController();
