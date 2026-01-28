const db = require("../../../../config/database");

class ServiceOrderDocumentModel {
  async save(data) {
    await db.execute(
      `INSERT INTO order_documents
    (order_id, service_document_id, file_path, document_data)
    VALUES (?, ?, ?, ?)`,
      [
        data.order_id,
        data.service_document_id,
        data.file_path,
        data.document_data,
      ],
    );
  }

  // Get required Docs
  async getRequiredDocs(orderId) {
    const [rows] = await db.execute(
      `
    SELECT
      sd.id AS service_document_id,
      sd.document_name,
      sd.is_mandatory,

      od.id AS order_document_id,
      od.file_path,
      od.document_data

    FROM service_orders so
    JOIN service_documents sd 
      ON sd.service_id = so.service_id

    LEFT JOIN order_documents od 
      ON od.service_document_id = sd.id
      AND od.order_id = so.id

    WHERE so.id = ?
    ORDER BY sd.id
    `,
      [orderId],
    );

    return rows.map((r) => {
      let parsedData = {};
      try {
        parsedData = r.document_data ? JSON.parse(r.document_data) : {};
      } catch {
        parsedData = {};
      }

      return {
        service_document_id: r.service_document_id,
        document_name: r.document_name,
        is_mandatory: r.is_mandatory,
        uploaded: !!r.order_document_id,
        file_path: r.file_path,
        document_data: parsedData,
      };
    });
  }
}

module.exports = new ServiceOrderDocumentModel();
