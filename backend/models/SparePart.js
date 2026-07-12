const mongoose = require("mongoose");

const sparePartSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    partNumber: { type: String, trim: true },
    category: { type: String, trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    supplier: { type: String, trim: true },
    lowStockThreshold: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SparePart", sparePartSchema);
