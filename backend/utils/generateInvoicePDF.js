const fs = require("fs");
const PDFDocument = require("pdfkit");

/**
 * Streams a generated invoice PDF directly to an HTTP response.
 * @param {Object} invoice - Invoice document (populated with customer & vehicle)
 * @param {Object} workshop - { workshopName, phone, email, address, logoPath }
 *   logoPath must be an absolute filesystem path to a PNG/JPG file (or omitted/undefined).
 * @param {Object} res - Express response object
 */
function generateInvoicePDF(invoice, workshop, res) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=invoice-${invoice.invoiceNumber}.pdf`
  );

  doc.pipe(res);

  const pageLeft = doc.page.margins.left; // 50
  const pageRight = doc.page.width - doc.page.margins.right; // 545
  const contentWidth = pageRight - pageLeft;
  const headerTop = doc.y;

  // ---------- Header: logo + workshop name (left), invoice meta (right) ----------
  const logoSize = 55;
  let nameX = pageLeft;
  let nameWidth = 280;

  if (workshop.logoPath && fs.existsSync(workshop.logoPath)) {
    try {
      doc.image(workshop.logoPath, pageLeft, headerTop, { fit: [logoSize, logoSize] });
      nameX = pageLeft + logoSize + 12;
      nameWidth = 280 - logoSize - 12;
    } catch (e) {
      // Corrupt/unsupported image — skip the logo rather than failing the whole PDF.
    }
  }

  doc
    .fontSize(19)
    .fillColor("#1e293b")
    .text(workshop.workshopName || "Workshop", nameX, headerTop, { width: nameWidth });

  doc
    .fontSize(16)
    .fillColor("#0f172a")
    .text("INVOICE", pageLeft, headerTop, { width: contentWidth, align: "right" });
  doc
    .fontSize(10)
    .fillColor("#475569")
    .text(`Invoice #: ${invoice.invoiceNumber}`, pageLeft, headerTop + 22, {
      width: contentWidth,
      align: "right",
    })
    .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, pageLeft, headerTop + 36, {
      width: contentWidth,
      align: "right",
    });

  doc.y = headerTop + Math.max(logoSize, 50) + 12;

  doc.strokeColor("#cbd5e1").moveTo(pageLeft, doc.y).lineTo(pageRight, doc.y).stroke();
  doc.moveDown();

  // ---------- Customer & vehicle info ----------
  doc.fontSize(12).fillColor("#0f172a").text("Bill To:", { underline: true });
  doc
    .fontSize(10)
    .fillColor("#334155")
    .text(invoice.customer?.name || "-")
    .text(invoice.customer?.phone || "")
    .text(invoice.customer?.address || "");

  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#0f172a").text("Vehicle:", { underline: true });
  doc
    .fontSize(10)
    .fillColor("#334155")
    .text(
      `${invoice.vehicle?.brand || ""} ${invoice.vehicle?.model || ""} (${
        invoice.vehicle?.regNumber || "-"
      })`
    );

  doc.moveDown(1);

  // ---------- Line items table ----------
  const tableTop = doc.y;
  doc.fontSize(10).fillColor("#ffffff");
  doc.rect(50, tableTop, 495, 20).fill("#1e293b");
  doc
    .fillColor("#ffffff")
    .text("Description", 55, tableTop + 5, { width: 250 })
    .text("Qty", 310, tableTop + 5, { width: 50, align: "right" })
    .text("Price", 365, tableTop + 5, { width: 80, align: "right" })
    .text("Total", 455, tableTop + 5, { width: 80, align: "right" });

  let y = tableTop + 25;
  doc.fillColor("#334155");
  invoice.items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.rect(50, y - 3, 495, 20).fill("#f1f5f9");
      doc.fillColor("#334155");
    }
    doc
      .fontSize(10)
      .text(item.description, 55, y, { width: 250 })
      .text(String(item.qty), 310, y, { width: 50, align: "right" })
      .text(item.price.toFixed(2), 365, y, { width: 80, align: "right" })
      .text(item.total.toFixed(2), 455, y, { width: 80, align: "right" });
    y += 20;
  });

  doc.moveDown(2);
  y += 15;

  // ---------- Totals ----------
  const totalsX = 365;
  doc.fontSize(10).fillColor("#334155");
  doc.text(`Subtotal:`, totalsX, y, { width: 80, align: "right" });
  doc.text(invoice.subtotal.toFixed(2), 455, y, { width: 80, align: "right" });
  y += 16;
  doc.text(`Tax:`, totalsX, y, { width: 80, align: "right" });
  doc.text(invoice.tax.toFixed(2), 455, y, { width: 80, align: "right" });
  y += 16;
  doc.text(`Discount:`, totalsX, y, { width: 80, align: "right" });
  doc.text(invoice.discount.toFixed(2), 455, y, { width: 80, align: "right" });
  y += 16;
  doc
    .fontSize(12)
    .fillColor("#0f172a")
    .text(`Grand Total:`, totalsX, y, { width: 80, align: "right" });
  doc.text(invoice.grandTotal.toFixed(2), 455, y, { width: 80, align: "right" });

  y += 25;
  doc
    .fontSize(10)
    .fillColor("#475569")
    .text(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`, 50, y);
  doc.text(`Amount Paid: ${invoice.amountPaid.toFixed(2)}`, 50, y + 15);
  doc.text(`Balance Due: ${invoice.balanceDue.toFixed(2)}`, 50, y + 30);

  // ---------- Footer: workshop address & phone, pinned near the bottom of the page ----------
  const footerY = doc.page.height - doc.page.margins.bottom - 65;
  doc.strokeColor("#e2e8f0").moveTo(pageLeft, footerY).lineTo(pageRight, footerY).stroke();

  let footerLineY = footerY + 10;
  doc.fontSize(9).fillColor("#64748b");

  if (workshop.address) {
    doc.text(workshop.address, pageLeft, footerLineY, { width: contentWidth, align: "center" });
    footerLineY += 13;
  }

  const contactBits = [];
  if (workshop.phone) contactBits.push(`Phone: ${workshop.phone}`);
  if (workshop.email) contactBits.push(`Email: ${workshop.email}`);
  if (contactBits.length) {
    doc.text(contactBits.join("    |    "), pageLeft, footerLineY, {
      width: contentWidth,
      align: "center",
    });
    footerLineY += 13;
  }

  doc
    .fontSize(8)
    .fillColor("#94a3b8")
    .text("Thank you for your business!", pageLeft, footerLineY, {
      width: contentWidth,
      align: "center",
    });

  doc.end();
}

module.exports = generateInvoicePDF;
