const db = require("../config/database");
const path = require("path");

class VendorModel {
  /* ============================================================
      CREATE VENDOR
  ============================================================ */
  async createVendor(connection, data, userId, vendorId) {
    const [result] = await connection.execute(
      `UPDATE vendors
     SET
       company_name = ?,
       full_name = ?,
       vendor_type = ?,
       gstin = ?,
       ipaddress = ?,
       pan_number = ?,
       status = 'sent_for_approval',
       rejection_reason = NULL,
       onboarding_flag = 0
     WHERE vendor_id = ? AND user_id = ?`,
      [
        data.companyName || null,
        data.fullName || null,
        data.vendorType || null,
        data.gstin || null,
        data.ip_address || null,
        data.panNumber || null,
        vendorId,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      throw new Error("Vendor update failed");
    }

    const [rows] = await connection.execute(
      `SELECT * FROM vendors WHERE vendor_id = ?`,
      [vendorId]
    );

    return rows[0];
  }

  /* ============================================================
      INSERT ADDRESS (business/billing/shipping)
  ============================================================ */
  async insertAddress(connection, vendorId, type, d) {
    await connection.execute(
      `DELETE FROM vendor_addresses WHERE vendor_id = ? AND type = ?`,
      [vendorId, type]
    );

    const address = {
      line1: d[`${type}AddressLine1`] || d.addressLine1 || "",
      line2: d[`${type}AddressLine2`] || d.addressLine2 || "",
      line3: d[`${type}AddressLine3`] || d.addressLine3 || "",
      city: d[`${type}City`] || d.city || "",
      state: d[`${type}State`] || d.state || "",
      pincode: d[`${type}Pincode`] || d.pincode || "",
    };

    await connection.execute(
      `INSERT INTO vendor_addresses 
        (vendor_id, type, line1, line2, line3, city, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vendorId,
        type,
        address.line1,
        address.line2,
        address.line3,
        address.city,
        address.state,
        address.pincode,
      ]
    );
  }

  /* ============================================================
      INSERT BANK DETAILS
  ============================================================ */
  async insertBankDetails(connection, vendorId, d) {
    await connection.execute(
      `DELETE FROM vendor_bank_details WHERE vendor_id = ?`,
      [vendorId]
    );
    await connection.execute(
      `INSERT INTO vendor_bank_details 
        (vendor_id, bank_name, account_number, branch, ifsc_code)
       VALUES (?, ?, ?, ?, ?)`,
      [
        vendorId,
        d.bankName || "",
        d.accountNumber || "",
        d.branch || "",
        d.ifscCode || "",
      ]
    );
  }

  /* ============================================================
      INSERT CONTACT DETAILS
  ============================================================ */
  async insertContacts(connection, vendorId, d) {
    await connection.execute(
      `DELETE FROM vendor_contacts WHERE vendor_id = ?`,
      [vendorId]
    );

    await connection.execute(
      `INSERT INTO vendor_contacts
        (vendor_id, primary_contact, alternate_contact, email, payment_terms, comments)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        vendorId,
        d.primaryContactNumber || "",
        d.alternateContactNumber || null,
        d.email || "",
        d.paymentTerms || "",
        d.comments || "",
      ]
    );
  }

  // get list name
  async getApprovedVendorList() {
    try {
      const [vendorRows] = await db.execute(
        `SELECT vendor_id, full_name FROM vendors WHERE status = 'approved';`
      );

      return vendorRows;
    } catch (error) {
      console.error("Error fetching vendor List:", error);
      throw error;
    }
  }

  /* ============================================================
      INSERT DOCUMENTS (DYNAMIC)
      Works with ANY file key from frontend
  ============================================================ */
  async insertCommonDocuments(connection, vendorId, files) {
    await connection.execute(
      `UPDATE vendor_documents
          SET is_active = 0
          WHERE vendor_id = ?`,
      [vendorId]
    );

    for (const key of Object.keys(files)) {
      const file = files[key][0];

      const relativePath = path.join(
        "vendors",
        vendorId.toString(),
        "documents",
        file.filename
      );

      await connection.execute(
        `INSERT INTO vendor_documents 
           (vendor_id, document_key, file_path, mime_type, uploaded_at, is_active)
         VALUES (?, ?, ?, ?, NOW(),1)`,
        [vendorId, key, relativePath, file.mimetype]
      );
    }
  }

  /* ============================================================
      GET VENDOR DETAILS
  ============================================================ */
  async getVendorById(vendorId) {
    const [[vendor]] = await db.execute(
      `SELECT v.*, u.email, u.phone
       FROM vendors v 
       JOIN users u ON v.user_id = u.user_id
       WHERE v.vendor_id = ?`,
      [vendorId]
    );

    if (!vendor) return null;

    const [addresses] = await db.execute(
      "SELECT * FROM vendor_addresses WHERE vendor_id = ?",
      [vendorId]
    );

    const [[bank]] = await db.execute(
      "SELECT * FROM vendor_bank_details WHERE vendor_id = ?",
      [vendorId]
    );

    const [[contacts]] = await db.execute(
      "SELECT * FROM vendor_contacts WHERE vendor_id = ?",
      [vendorId]
    );

    const [documents] = await db.execute(
      "SELECT * FROM vendor_documents WHERE vendor_id = ? AND is_active=1",
      [vendorId]
    );

    return { vendor, addresses, bank, contacts, documents };
  }

  /* ============================================================
      GET ALL VENDORS
  ============================================================ */
  async getAllVendors(status = null) {
    let sql = `
      SELECT v.*, u.email
      FROM vendors v
      JOIN users u ON v.user_id = u.user_id
    `;
    const params = [];

    if (status) {
      sql += ` WHERE v.status = ?`;
      params.push(status);
    }

    const [rows] = await db.execute(sql, params);
    return rows;
  }

  /* ============================================================
      UPDATE VENDOR STATUS
  ============================================================ */
  async updateVendorStatus(vendorId, status, reason = null) {
    const onboarding_flag = status === "approved" ? 1 : 0;

    const [result] = await db.execute(
      `UPDATE vendors
     SET status = ?,
         onboarding_flag = ?,
         rejection_reason = ?,
         created_at = NOW()
     WHERE vendor_id = ?`,
      [status, onboarding_flag, reason, vendorId]
    );

    return result.affectedRows > 0;
  }
}

module.exports = new VendorModel();
