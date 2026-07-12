const express = require("express");
const router = express.Router();
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoicePayment,
  downloadInvoicePDF,
  getPublicInvoicePDF,
  resendInvoiceWhatsApp,
  deleteInvoice,
} = require("../controllers/invoiceController");
const { protect } = require("../middleware/auth");

// Unauthenticated route — this is the link Twilio/WhatsApp fetches the PDF from.
// It's secured by a random per-invoice token instead of a login session.
router.get("/public/:id/:token/pdf", getPublicInvoicePDF);

router.use(protect);

router.route("/").get(getInvoices).post(createInvoice);
router.route("/:id").get(getInvoiceById).delete(deleteInvoice);
router.get("/:id/pdf", downloadInvoicePDF);
router.post("/:id/payment", updateInvoicePayment);
router.post("/:id/send-whatsapp", resendInvoiceWhatsApp);

module.exports = router;
