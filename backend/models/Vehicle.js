const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    type: { type: String, enum: ["car", "bike", "truck", "other"], default: "car" },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    regNumber: { type: String, required: true, trim: true, uppercase: true },
    year: { type: Number },
    color: { type: String, trim: true },
  },
  { timestamps: true }
);

vehicleSchema.index({ owner: 1, regNumber: 1 }, { unique: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);
