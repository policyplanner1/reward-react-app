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
}

module.exports = new ServiceOrderDocumentModel();
