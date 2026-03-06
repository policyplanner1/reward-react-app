const html_to_pdf = require("html-pdf-node");
const fs = require("fs");
const path = require("path");

async function generateInvoicePDF(html, fileName = null) {
  try {
    const options = {
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px",
      },
    };

    const file = { content: html };

    const pdfBuffer = await html_to_pdf.generatePdf(file, options);

    // Save to disk if filename provided
    if (fileName) {
      const filePath = path.join(
        __dirname,
        "../../uploads/invoices",
        `${fileName}.pdf`
      );

      fs.writeFileSync(filePath, pdfBuffer);

      return {
        path: filePath,
        buffer: pdfBuffer,
      };
    }

    return pdfBuffer;
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
}

module.exports = {
  generateInvoicePDF,
};