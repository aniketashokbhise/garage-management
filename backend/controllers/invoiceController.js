const crypto = require("crypto");
const path = require("path");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const generateInvoicePDF = require("../utils/generateInvoicePDF");
const { sendInvoiceWhatsApp } = require("../utils/sendWhatsApp");

// Builds the { workshopName, phone, email, address, logoPath } object the PDF generator
// expects, resolving the stored logoUrl (e.g. "/uploads/logos/xyz.png") to an absolute
// path on disk so pdfkit can embed the actual image file.
const buildWorkshopInfo = (owner) => ({
  workshopName: owner?.workshopName,
  phone: owner?.phone,
  email: owner?.email,
  address: owner?.address,
  logoPath: owner?.logoUrl
    ? path.join(__dirname, "..", owner.logoUrl.replace(/^\/+/, ""))
    : undefined,
});

const generateInvoiceNumber = async (ownerId) => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Base the next number on the HIGHEST existing number for this owner+year, not a
  // simple count of documents. Counting breaks the moment any invoice is ever deleted:
  // e.g. with invoices 0001-0005, deleting 0003 drops the count to 4, so the next
  // invoice would be regenerated as "0005" again -- a duplicate of the invoice that's
  // still there. Looking at the actual max number in use avoids that entirely.
  const lastInvoice = await Invoice.findOne({
    owner: ownerId,
    invoiceNumber: { $regex: `^${prefix}` },
  }).sort({ invoiceNumber: -1 });

  let nextSeq = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
};

// Publicly reachable base URL of this backend (e.g. an ngrok URL or your deployed domain).
// Twilio needs to fetch the PDF from the internet, so localhost won't work in production.
const getPublicBaseUrl = () =>
  process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;

const buildPublicPdfUrl = (invoice) =>
  `${getPublicBaseUrl()}/api/invoices/public/${invoice._id}/${invoice.whatsappToken}/pdf`;

/**
 * Sends the invoice to the customer's WhatsApp and persists the result on the invoice.
 * Never throws — failures are recorded on the invoice so they don't block the request.
 */
const dispatchInvoiceWhatsApp = async (invoice, owner) => {
  await invoice.populate("customer");
  await invoice.populate("vehicle");

  const result = await sendInvoiceWhatsApp({
    invoice,
    customer: invoice.customer,
    workshop: { workshopName: owner.workshopName },
    pdfUrl: buildPublicPdfUrl(invoice),
  });

  invoice.whatsappStatus = result.ok ? "sent" : "failed";
  invoice.whatsappSentAt = result.ok ? new Date() : invoice.whatsappSentAt;
  invoice.whatsappError = result.ok ? undefined : result.error;
  await invoice.save();

  return result;
};

const getInvoices = async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.customer) filter.customer = req.query.customer;

    const invoices = await Invoice.find(filter)
      .populate("customer", "name phone")
      .populate("vehicle", "brand model regNumber")
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    next(err);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id })
      .populate("customer")
      .populate("vehicle");
    if (!invoice) {
      res.status(404);
      throw new Error("Invoice not found");
    }
    res.json(invoice);
  } catch (err) {
    next(err);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const {
      serviceOrder,
      customer,
      vehicle,
      items,
      tax = 0,
      discount = 0,
      paymentMode,
      amountPaid = 0,
    } = req.body;

    if (!customer || !vehicle || !items || items.length === 0) {
      res.status(400);
      throw new Error("Customer, vehicle, and at least one item are required");
    }

    const itemsWithTotals = items.map((i) => ({
      ...i,
      total: i.qty * i.price,
    }));
    const subtotal = itemsWithTotals.reduce((sum, i) => sum + i.total, 0);
    const grandTotal = subtotal + Number(tax) - Number(discount);
    const balanceDue = grandTotal - Number(amountPaid);

    let paymentStatus = "unpaid";
    if (amountPaid >= grandTotal && grandTotal > 0) paymentStatus = "paid";
    else if (amountPaid > 0) paymentStatus = "partial";

    // Retry a few times on a duplicate invoiceNumber. This is a genuine (if rare) race:
    // if two invoices for the same owner are created within milliseconds of each other,
    // both requests can read the same "last invoice number" before either has saved,
    // and then both try to save the same next number. The unique index on
    // {owner, invoiceNumber} catches that collision; we just regenerate and retry.
    let invoice;
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const invoiceNumber = await generateInvoiceNumber(req.user._id);
        invoice = await Invoice.create({
          owner: req.user._id,
          invoiceNumber,
          serviceOrder,
          customer,
          vehicle,
          items: itemsWithTotals,
          subtotal,
          tax,
          discount,
          grandTotal,
          paymentMode,
          amountPaid,
          balanceDue,
          paymentStatus,
          whatsappToken: crypto.randomBytes(16).toString("hex"),
        });
        lastErr = null;
        break;
      } catch (err) {
        if (err.code === 11000 && err.keyPattern?.invoiceNumber) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    if (lastErr) throw lastErr;

    if (amountPaid > 0) {
      await Payment.create({
        owner: req.user._id,
        invoice: invoice._id,
        amount: amountPaid,
        mode: paymentMode || "cash",
      });
    }

    // Send the invoice to the customer's WhatsApp right away. Failures are logged on the
    // invoice (whatsappStatus/whatsappError) but never block the invoice from being created.
    const whatsapp = await dispatchInvoiceWhatsApp(invoice, req.user);
    if (!whatsapp.ok) {
      console.warn(`[WhatsApp] Invoice ${invoice.invoiceNumber} not sent: ${whatsapp.error}`);
    }

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
};

const updateInvoicePayment = async (req, res, next) => {
  try {
    const { amount, mode, notes } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id });
    if (!invoice) {
      res.status(404);
      throw new Error("Invoice not found");
    }

    invoice.amountPaid += Number(amount);
    invoice.balanceDue = invoice.grandTotal - invoice.amountPaid;
    invoice.paymentStatus =
      invoice.amountPaid >= invoice.grandTotal
        ? "paid"
        : invoice.amountPaid > 0
        ? "partial"
        : "unpaid";
    await invoice.save();

    await Payment.create({
      owner: req.user._id,
      invoice: invoice._id,
      amount,
      mode: mode || "cash",
      notes,
    });

    res.json(invoice);
  } catch (err) {
    next(err);
  }
};

const downloadInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id })
      .populate("customer")
      .populate("vehicle");
    if (!invoice) {
      res.status(404);
      throw new Error("Invoice not found");
    }

    const workshop = buildWorkshopInfo(req.user);

    generateInvoicePDF(invoice, workshop, res);
  } catch (err) {
    next(err);
  }
};

// No auth — this is the URL Twilio fetches the PDF from, and what the customer sees
// if they tap the media link in WhatsApp. Protected only by the random whatsappToken.
const getPublicInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      whatsappToken: req.params.token,
    })
      .populate("customer")
      .populate("vehicle")
      .populate("owner", "workshopName phone email address logoUrl");
    if (!invoice) {
      res.status(404);
      throw new Error("Invoice not found");
    }

    const workshop = buildWorkshopInfo(invoice.owner);

    generateInvoicePDF(invoice, workshop, res);
  } catch (err) {
    next(err);
  }
};

// Lets the owner (re)send an already-created invoice to WhatsApp, e.g. if the first
// send failed or the customer wants it re-sent.
const resendInvoiceWhatsApp = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id });
    if (!invoice) {
      res.status(404);
      throw new Error("Invoice not found");
    }
    if (!invoice.whatsappToken) {
      invoice.whatsappToken = crypto.randomBytes(16).toString("hex");
      await invoice.save();
    }

    const result = await dispatchInvoiceWhatsApp(invoice, req.user);
    if (!result.ok) {
      res.status(502);
      throw new Error(result.error || "Failed to send WhatsApp message");
    }

    res.json({ message: "Invoice sent via WhatsApp", whatsappStatus: invoice.whatsappStatus });
  } catch (err) {
    next(err);
  }
};

const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id });
    if (!invoice) {
      res.status(404);
      throw new Error("Invoice not found");
    }
    await invoice.deleteOne();
    res.json({ message: "Invoice removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoicePayment,
  downloadInvoicePDF,
  getPublicInvoicePDF,
  resendInvoiceWhatsApp,
  deleteInvoice,
};
