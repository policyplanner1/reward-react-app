const ManagerModel = require("../models/managerModel");
const db = require("../config/database");

class ManagerController {
  // ========== BASIC STATS FOR CARDS ==========
  async getDashboardStats(req, res) {
    try {
      const data = await ManagerModel.fetchStats();
      res.json({ success: true, data });
    } catch (err) {
      console.error("STATS ERROR:", err);
      res.status(500).json({ success: false, message: "Failed to load stats" });
    }
  }

  // ========== CHARTS DATA ==========
  async getDashboardCharts(req, res) {
    try {
      const data = await ManagerModel.fetchCharts();
      res.json({ success: true, data });
    } catch (err) {
      console.error("CHARTS ERROR:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to load chart data" });
    }
  }

  // all Vendor List
  async vendorList(req, res) {
    const role = req.user?.role;

    try {
      if (role != "vendor_manager" && role != "admin") {
        return res
          .status(400)
          .json({ success: false, message: "Unauthorized user" });
      }

      const [vendorRows] = await db.query(
        `
        SELECT 
          v.*,
          u.email,
          u.phone,
          u.name,
          u.role
        FROM vendors v
        JOIN users u ON v.user_id = u.user_id
        WHERE v.status != 'pending'
          `,
        [role]
      );

      if (vendorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      return res.json({
        data: vendorRows,
        success: true,
        message: "vendor fetched successfully",
      });
    } catch (error) {
      console.error("Error fetching vendor List:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch Vendor Details" });
    }
  }

  // Approve vendor Product
  async approveProduct(req, res) {
    try {
      const { productId } = req.params;

      if (!productId) {
        return res
          .status(400)
          .json({ success: false, message: "Product ID is required" });
      }

      const [productRows] = await db.query(
        `SELECT * FROM products WHERE product_id = ?`,
        [productId]
      );

      if (productRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const product = productRows[0];

      if (productRows.length > 0) {
        await db.query(
          `UPDATE products
         SET status = 'approved',rejection_reason=''
         WHERE product_id = ?`,
          [product.product_id]
        );
      }

      return res.json({
        success: true,
        message: "Product approved successfully",
      });
    } catch (error) {
      console.error("Approve product error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to approve products" });
    }
  }

  // reject vendor Product
  async rejectProduct(req, res) {
    try {
      const { productId } = req.params;
      const { reason } = req.body;

      if (!productId) {
        return res
          .status(400)
          .json({ success: false, message: "Product ID is required" });
      }

      const [productRows] = await db.query(
        `SELECT * FROM products WHERE product_id = ?`,
        [productId]
      );

      if (productRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const product = productRows[0];

      if (productRows.length > 0) {
        await db.query(
          `UPDATE products
         SET status = 'rejected',rejection_reason = ?
         WHERE product_id = ?`,
          [reason, product.product_id]
        );
      }

      return res.json({
        success: true,
        message: "Product rejected successfully",
      });
    } catch (error) {
      console.error("Reject product error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to reject product" });
    }
  }

  // Resubmission needed for vendor Product
  async resubmissionRequest(req, res) {
    try {
      const { productId } = req.params;
      const { reason } = req.body;

      if (!productId) {
        return res
          .status(400)
          .json({ success: false, message: "Product ID is required" });
      }

      const [productRows] = await db.query(
        `SELECT * FROM products WHERE product_id = ?`,
        [productId]
      );

      if (productRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const product = productRows[0];

      if (productRows.length > 0) {
        await db.query(
          `UPDATE products
         SET status = 'resubmission',rejection_reason = ?
         WHERE product_id = ?`,
          [reason, product.product_id]
        );
      }

      return res.json({
        success: true,
        message: "Resubmission requested successfully",
      });
    } catch (error) {
      console.error("Product Resubmission error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send resubmission reject",
      });
    }
  }

  // get all documents
  async getAllDocuments(req, res) {
    try {
      const [rows] = await db.query(`SELECT * from documents`);

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error("Get all Document error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching Documents",
        error: error.message,
      });
    }
  }

  // create a Document
  async createDocument(req, res) {
    try {
      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Document name is required",
        });
      }

      const [result] = await db.query(
        `INSERT INTO documents (document_name, status, created_at)
         VALUES (?, 1, NOW())`,
        [name]
      );

      res.status(201).json({
        success: true,
        message: "Document created successfully",
      });
    } catch (error) {
      console.error("Document creation error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating Document",
        error: error.message,
      });
    }
  }

  // document By Id
  async getDocumentById(req, res) {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Invalid document ID",
        });
      }

      const [rows] = await db.query(
        `SELECT * FROM documents WHERE document_id = ?`,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      res.status(200).json({
        success: true,
        data: rows[0],
      });
    } catch (error) {
      console.error("Get Document error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching document",
      });
    }
  }

  // update Doc
  async updateDocument(req, res) {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Invalid document ID",
        });
      }

      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Document name is required",
        });
      }

      // if (status === undefined) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Status is required",
      //   });
      // }
      const [result] = await db.query(
        `UPDATE documents 
         SET document_name = ?
         WHERE document_id = ?`,
        [name, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      const [rows] = await db.execute(
        `SELECT * FROM documents WHERE document_id = ?`,
        [id]
      );

      res.status(200).json({
        success: true,
        message: "Document updated successfully",
        data: rows[0],
      });
    } catch (error) {
      console.error("Update Document error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating Document",
      });
    }
  }

  // delete Document
  async deleteDocument(req, res) {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Invalid document ID",
        });
      }

      const [result] = await db.execute(
        `DELETE FROM documents WHERE document_id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }
      res.status(200).json({
        success: true,
        message: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Delete Document error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting Document",
      });
    }
  }

  // create category Document
  async createCategoryDocument(req, res) {
    try {
      const { category_id, document_id } = req.body;

      if (!category_id || !document_id) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID or Document ID",
        });
      }

      if (isNaN(category_id) || isNaN(document_id)) {
        return res.status(400).json({
          success: false,
          message: "Category ID and Document ID must be numbers",
        });
      }

      const [result] = await db.query(
        `INSERT INTO category_document (category_id, document_id, created_at)
       VALUES (?, ?, NOW())`,
        [category_id, document_id]
      );

      if (result.affectedRows > 0) {
        return res.status(201).json({
          success: true,
          message: "Document linked successfully",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Failed to link document",
        });
      }
    } catch (error) {
      console.error("Document link error:", error);
      res.status(500).json({
        success: false,
        message: "Document link error",
      });
    }
  }

  // get all category document
  async getAllCategoryDocs(req, res) {
    try {
      const [rows] = await db.query(
        `SELECT cd.*, c.category_name ,d.document_name
         FROM category_document cd
         LEFT JOIN categories c ON cd.category_id = c.category_id
         LEFT JOIN documents d on cd.document_id = d.document_id`
      );

      res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.error("Get all Category Documents error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching Category Documents",
        error: error.message,
      });
    }
  }

  // get category doc by Id
  async getCategoryDocById(req, res) {
    try {
      const id = req.params.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Invalid category-document ID",
        });
      }

      const [row] = await db.query(
        `SELECT cd.*, c.category_name ,d.document_name
         FROM category_document cd
         LEFT JOIN categories c ON cd.category_id = c.category_id
         LEFT JOIN documents d on cd.document_id = d.document_id
         WHERE cd.id = ?`,
        [id]
      );

      res.status(200).json({
        success: true,
        data: row[0],
      });
    } catch (error) {
      console.error("Get category doc error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching category document",
        error: error.message,
      });
    }
  }

  // Delete category Document
  async deleteCategoryDocument(req, res) {
    try {
      const id = req.params.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Invalid category-document ID",
        });
      }

      const [result] = await db.query(
        `DELETE FROM category_document WHERE id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Delete Document error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting Document",
        error: error.message,
      });
    }
  }
}

module.exports = new ManagerController();
