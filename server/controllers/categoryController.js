const db = require("../config/database");
const XLSX = require("xlsx");

class CategoryController {
  // Get all categories
  async getAllCategories(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM categories ORDER BY category_name ASC`,
      );

      res.json({
        success: true,
        data: rows,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Get documents mapped with selected category
  async getCategoryDocuments(req, res) {
    try {
      const { categoryId } = req.params;

      const [docs] = await db.execute(
        `SELECT dt.document_type_id, dt.document_name, dt.document_key,
                dt.accepted_formats, dt.is_required
         FROM category_documents cd
         JOIN document_types dt ON cd.document_type_id = dt.document_type_id
         WHERE cd.category_id = ? AND dt.level='product'`,
        [categoryId],
      );

      res.json({
        success: true,
        data: docs,
      });
    } catch (err) {
      return res.json({
        success: true,
        data: [],
        message: err.message,
      });
    }
  }

  // category attributes
  async getCategoryAttributes(req, res) {
    try {
      const categoryId = Number(req.query.categoryId);
      const subcategoryId = req.query.subcategoryId
        ? Number(req.query.subcategoryId)
        : null;

      const [attributes] = await db.execute(
        `
      SELECT
        ca.id,
        ca.attribute_key,
        ca.attribute_label,
        ca.input_type,
        ca.is_variant,
        ca.is_required,
        ca.sort_order,
        GROUP_CONCAT(cav.value ORDER BY cav.sort_order) AS options
      FROM category_attributes ca
      LEFT JOIN category_attribute_values cav
        ON cav.attribute_id = ca.id
       WHERE
        ca.is_active = 1
        AND (
          ca.subcategory_id = ?
          OR (ca.category_id = ? AND ca.subcategory_id IS NULL)
        )
      GROUP BY ca.id
      ORDER BY ca.sort_order ASC
      `,
        [subcategoryId, categoryId],
      );

      const formatted = attributes.map((a) => ({
        ...a,
        options: a.options ? a.options.split(",") : [],
      }));

      return res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch category attributes",
      });
    }
  }

  async downloadTemplate(req, res) {
    try {
      const categoryId = Number(req.query.categoryId);
      const subcategoryId = req.query.subcategoryId
        ? Number(req.query.subcategoryId)
        : null;

      const [attributes] = await db.execute(
        `
      SELECT
        ca.id,
        ca.attribute_key,
        ca.attribute_label,
        ca.input_type,
        ca.is_variant,
        ca.is_required,
        ca.sort_order,
        GROUP_CONCAT(cav.value ORDER BY cav.sort_order) AS options
      FROM category_attributes ca
      LEFT JOIN category_attribute_values cav
        ON cav.attribute_id = ca.id
       WHERE
        ca.is_active = 1
        AND (
          ca.subcategory_id = ?
          OR (ca.category_id = ? AND ca.subcategory_id IS NULL)
        )
      GROUP BY ca.id
      ORDER BY ca.sort_order ASC
      `,
        [subcategoryId, categoryId],
      );

      if (!attributes.length) {
        return res.status(400).json({
          success: false,
          message: "No attributes found for this category",
        });
      }

      // format attributes
      const formatted = attributes.map((a) => ({
        key: a.attribute_key,
        label: a.is_required ? `${a.attribute_label} *` : a.attribute_label,
        options: a.options ? a.options.split(",") : [],
      }));

      const baseColumns = [
        "productName",
        "brandName",
        "manufacturer",
        "description",
        "shortDescription",
        "sale_price",
        "vendor_price",
        "stock",
        "sku",
        "barcode",
      ];

      const attributeColumns = formatted.map((a) => a.key);

      const headers = [...baseColumns, ...attributeColumns];

      const sampleRow = headers.map(() => "");
      const data = [headers, sampleRow];

      const ws = XLSX.utils.aoa_to_sheet(data);

      // Column width
      ws["!cols"] = headers.map(() => ({ wch: 20 }));

      // Add options hint (row 3)
      formatted.forEach((attr, index) => {
        const colIndex = baseColumns.length + index;
        const colLetter = XLSX.utils.encode_col(colIndex);

        // Row 2 → label
        ws[`${colLetter}2`] = {
          v: attr.label,
        };

        // Row 3 → options
        if (attr.options.length > 0) {
          ws[`${colLetter}3`] = {
            v: `Options: ${attr.options.join(", ")}`,
          };
        }
      });

      // workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");

      const buffer = XLSX.write(wb, {
        type: "buffer",
        bookType: "xlsx",
      });

      // IMPORTANT HEADERS
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=product_template.xlsx",
      );

      return res.send(buffer);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Failed to generate template",
      });
    }
  }
}

module.exports = new CategoryController();
