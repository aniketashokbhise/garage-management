const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    invoiceNumber: { type: String, required: true },
    serviceOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceOrder" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    items: [
      {
        description: String,
        qty: Number,
        price: Number,
        total: Number,
      },
    ],
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "unpaid",
    },
    paymentMode: {
      type: String,
      enum: ["cash", "card", "upi", "other"],
      default: "cash",
    },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    whatsappToken: { type: String },
    whatsappStatus: {
      type: String,
      enum: ["not_sent", "sent", "failed"],
      default: "not_sent",
    },
    whatsappSentAt: { type: Date },
    whatsappError: { type: String },
  },
  { timestamps: true }
);

// invoiceNumber only needs to be unique WITHIN one workshop owner's own invoices, not
// across every workshop that uses this deployment. A field-level `unique: true` on
// invoiceNumber (the old setup) creates a single global index, so two different
// workshop accounts generating the same "next" number (e.g. both create their 6th
// invoice of the year) collide with a "Duplicate field value entered" error even
// though the numbers are only meant to be unique per workshop.
invoiceSchema.index({ owner: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
