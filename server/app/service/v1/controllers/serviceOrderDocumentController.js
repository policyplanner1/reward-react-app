const ServiceOrderDocumentModel = require("../models/serviceOrderDocumentModel");
const fs = require("fs");
const path = require("path");
const { UPLOAD_BASE } = require("../../../../config/path");

class ServiceOrderDocumentController {
  async uploadDocument(req, res) {
    try {
      const { order_id, service_document_id, document_data } = req.body;

      if (!order_id || !service_document_id || !req.file) {
        return res.status(400).json({
          success: false,
          message: "order_id, service_document_id and file are required",
        });
      }

      //   Handle Image
      if (req.file) {
        const orderDir = path.join(
          UPLOAD_BASE,
          "service-orders",
          String(order_id),
        );

        fs.mkdirSync(orderDir, { recursive: true });

        const finalPath = path.join(orderDir, req.file.filename);

        fs.copyFileSync(req.file.path, finalPath);
        fs.unlinkSync(req.file.path);

        const filePath = `uploads/service-orders/${order_id}/${req.file.filename}`;

        await ServiceOrderDocumentModel.save({
          order_id,
          service_document_id,
          file_path: filePath,
          document_data: document_data
            ? JSON.stringify(JSON.parse(document_data))
            : null,
        });
      }

      res.json({
        success: true,
        message: "Document uploaded successfully",
      });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ServiceOrderDocumentController();
