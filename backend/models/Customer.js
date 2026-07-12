const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);

customerSchema.index({ owner: 1, phone: 1 });

module.exports = mongoose.model("Customer", customerSchema);
