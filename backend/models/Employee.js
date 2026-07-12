const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Auto-generated per owner, e.g. EMP-0001. Set in the pre-save hook below.
    employeeId: { type: String, trim: true },

    name: { type: String, required: true, trim: true },
    photo: { type: String, trim: true }, // stored as "/uploads/employees/<file>"
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    joiningDate: { type: Date, default: Date.now },
    jobRole: {
      type: String,
      enum: ["Mechanic", "Helper", "Manager", "Receptionist"],
      required: true,
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },

    salary: {
      monthlySalary: { type: Number, default: 0, min: 0 },
      salaryAdvance: { type: Number, default: 0, min: 0 }, // advance against this month's pay
      employeeLoan: { type: Number, default: 0, min: 0 }, // total loan issued to the employee
      advanceAmount: { type: Number, default: 0, min: 0 }, // amount already recovered against the loan
      remainingBalance: { type: Number, default: 0, min: 0 }, // employeeLoan - advanceAmount, auto-computed
      bonus: { type: Number, default: 0, min: 0 },
      overtimePay: { type: Number, default: 0, min: 0 },
      deductions: { type: Number, default: 0, min: 0 },
      netSalary: { type: Number, default: 0 }, // auto-computed, see pre-save hook
      paymentStatus: {
        type: String,
        enum: ["Paid", "Pending", "Partial"],
        default: "Pending",
      },
      lastPaymentDate: { type: Date },
    },

    attendance: {
      presentDays: { type: Number, default: 0, min: 0 },
      absentDays: { type: Number, default: 0, min: 0 },
      leaveDays: { type: Number, default: 0, min: 0 },
      attendancePercentage: { type: Number, default: 0, min: 0, max: 100 }, // auto-computed
    },
  },
  { timestamps: true }
);

employeeSchema.index({ owner: 1, employeeId: 1 }, { unique: true, sparse: true });
employeeSchema.index({ owner: 1, mobile: 1 });

// Keep the computed fields (employeeId, netSalary, remainingBalance, attendancePercentage)
// consistent every time the document is saved, so the frontend never has to duplicate this math.
employeeSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.employeeId) {
      const prefix = "EMP-";
      // Base the next number on the HIGHEST existing number for this owner, not a simple
      // count of documents, so it stays correct even after employees are deleted.
      const lastEmployee = await this.constructor
        .findOne({ owner: this.owner, employeeId: { $regex: `^${prefix}` } })
        .sort({ employeeId: -1 });

      let nextSeq = 1;
      if (lastEmployee) {
        const lastSeq = parseInt(lastEmployee.employeeId.slice(prefix.length), 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }
      this.employeeId = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }

    const s = this.salary || {};
    s.remainingBalance = Math.max((s.employeeLoan || 0) - (s.advanceAmount || 0), 0);
    s.netSalary =
      (s.monthlySalary || 0) +
      (s.bonus || 0) +
      (s.overtimePay || 0) -
      (s.deductions || 0) -
      (s.salaryAdvance || 0);

    const a = this.attendance || {};
    const totalDays = (a.presentDays || 0) + (a.absentDays || 0) + (a.leaveDays || 0);
    a.attendancePercentage = totalDays > 0 ? Math.round(((a.presentDays || 0) / totalDays) * 1000) / 10 : 0;

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Employee", employeeSchema);
