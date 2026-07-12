const mongoose = require("mongoose");

const serviceOrderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    odometerReading: { type: Number },
    servicesUsed: [
      {
        service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        name: String,
        cost: Number,
      },
    ],
    partsUsed: [
      {
        part: { type: mongoose.Schema.Types.ObjectId, ref: "SparePart" },
        name: String,
        qty: Number,
        unitPrice: Number,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    mechanicNotes: { type: String, trim: true },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceOrder", serviceOrderSchema);
