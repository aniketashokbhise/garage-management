const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    laborCost: { type: Number, required: true, min: 0 },
    estimatedTime: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
