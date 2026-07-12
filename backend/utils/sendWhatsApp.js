const twilio = require("twilio");

let client = null;

/**
 * Lazily creates the Twilio client. Returns null if credentials are not configured,
 * so the rest of the app can keep working (invoice creation, etc.) even without WhatsApp set up.
 */
function getClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  if (!client) client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
}

/**
 * Normalizes a phone number into Twilio's "whatsapp:+<countrycode><number>" format.
 * Defaults to India (+91) for bare 10-digit numbers — change DEFAULT_COUNTRY_CODE
 * in .env if your customers are in a different country.
 */
function formatWhatsAppNumber(phone) {
    let digits = String(phone || "").replace(/\D/g, "");

    // If already has +91 stored as 91XXXXXXXXXX
    if (digits.length === 12 && digits.startsWith("91")) {
        return `whatsapp:+${digits}`;
    }

    // Local Indian number
    if (digits.length === 10) {
        return `whatsapp:+91${digits}`;
    }

    throw new Error("Invalid phone number");
}
/**
 * Sends the invoice to the customer's WhatsApp number, with the PDF attached as media
 * and a short text summary as the message body.
 *
 * @param {Object} params
 * @param {Object} params.invoice - Invoice doc (with items, totals, invoiceNumber, etc.)
 * @param {Object} params.customer - Customer doc (needs name + phone)
 * @param {Object} params.workshop - { workshopName }
 * @param {String} params.pdfUrl - Publicly reachable URL that serves the invoice PDF
 * @returns {Promise<{ok: boolean, sid?: string, error?: string}>}
 */
async function sendInvoiceWhatsApp({ invoice, customer, workshop, pdfUrl }) {
  const twilioClient = getClient();

  if (!twilioClient) {
    return {
      ok: false,
      error:
        "WhatsApp is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM in backend/.env",
    };
  }
  if (!customer?.phone) {
    return { ok: false, error: "Customer has no phone number on file" };
  }
  if (!process.env.TWILIO_WHATSAPP_FROM) {
    return { ok: false, error: "TWILIO_WHATSAPP_FROM is not set in backend/.env" };
  }

  const body =
    `*${workshop?.workshopName || "Workshop"}*\n` +
    `Invoice: ${invoice.invoiceNumber}\n\n` +
    `Hi ${customer.name}, your bill is ready.\n` +
    `Total: Rs. ${Number(invoice.grandTotal).toFixed(2)}\n` +
    `Paid: Rs. ${Number(invoice.amountPaid).toFixed(2)}\n` +
    `Balance Due: Rs. ${Number(invoice.balanceDue).toFixed(2)}\n\n` +
    `Your invoice PDF is attached. Thank you for your business!`;

  try {
    const message = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: formatWhatsAppNumber(customer.phone),
      body,
      mediaUrl: pdfUrl ? [pdfUrl] : undefined,
    });
    return { ok: true, sid: message.sid };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendInvoiceWhatsApp, formatWhatsAppNumber };
