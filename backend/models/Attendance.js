const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    // Stored as a UTC midnight timestamp for the calendar day, e.g. "2026-07-12" -> 2026-07-12T00:00:00Z.
    // This is what the unique index below relies on to represent "one day", independent of time-of-day.
    date: { type: Date, required: true },
    status: { type: String, enum: ["Present", "Absent", "Leave"], required: true },
  },
  { timestamps: true }
);

// The DB-level guarantee that an employee can only have one attendance record per day.
// The controller also upserts on this same (owner, employee, date) combination, so marking
// attendance twice for the same day updates the existing record instead of creating a duplicate.
attendanceSchema.index({ owner: 1, employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
