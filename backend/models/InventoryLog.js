const mongoose = require("mongoose");

const inventoryLogSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    part: { type: mongoose.Schema.Types.ObjectId, ref: "SparePart", required: true },
    partName: { type: String, required: true }, // snapshot, survives part deletion
    type: {
      type: String,
      enum: ["initial", "purchase", "usage", "adjustment"],
      required: true,
    },
    quantityChange: { type: Number, required: true }, // positive = added, negative = removed
    quantityAfter: { type: Number, required: true }, // stock level after this change
    note: { type: String, trim: true },
    serviceOrder: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceOrder" }, // set for "usage" entries
    supplier: { type: String, trim: true }, // set for "purchase" entries
    costPrice: { type: Number }, // set for "purchase" entries
  },
  { timestamps: true }
);

inventoryLogSchema.index({ owner: 1, part: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryLog", inventoryLogSchema);
