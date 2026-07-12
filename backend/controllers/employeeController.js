const path = require("path");
const fs = require("fs");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");

// Fields that arrive as flat strings from the multipart form and need to be
// coerced onto the nested salary/attendance sub-documents.
const SALARY_FIELDS = [
  "monthlySalary",
  "salaryAdvance",
  "employeeLoan",
  "advanceAmount",
  "bonus",
  "overtimePay",
  "deductions",
];
const toNumber = (val, fallback = 0) => {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

const applyBodyToEmployee = (employee, body) => {
  const basicFields = ["name", "mobile", "email", "address", "jobRole", "status"];
  basicFields.forEach((f) => {
    if (body[f] !== undefined) employee[f] = body[f];
  });
  if (body.joiningDate) employee.joiningDate = body.joiningDate;

  SALARY_FIELDS.forEach((f) => {
    if (body[f] !== undefined) employee.salary[f] = toNumber(body[f], employee.salary[f]);
  });
  if (body.paymentStatus !== undefined) employee.salary.paymentStatus = body.paymentStatus;
  if (body.lastPaymentDate !== undefined) {
    employee.salary.lastPaymentDate = body.lastPaymentDate || undefined;
  }
  // Note: attendance.presentDays/absentDays/leaveDays are NOT set here. They're tracked
  // date-wise in the Attendance collection and recalculated by attendanceController
  // whenever a day is marked, so the employee form no longer edits them directly.
};

const getEmployees = async (req, res, next) => {
  try {
    const { search = "", jobRole = "", status = "" } = req.query;
    const query = {
      owner: req.user._id,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ],
    };
    if (jobRole) query.jobRole = jobRole;
    if (status) query.status = status;

    const employees = await Employee.find(query).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    next(err);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, owner: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    res.json(employee);
  } catch (err) {
    next(err);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const { name, mobile, jobRole } = req.body;
    if (!name || !mobile || !jobRole) {
      res.status(400);
      throw new Error("Name, mobile number, and job role are required");
    }

    const employee = new Employee({
      owner: req.user._id,
      name,
      mobile,
      jobRole,
      salary: {},
      attendance: {},
    });
    applyBodyToEmployee(employee, req.body);

    if (req.file) {
      employee.photo = `/uploads/employees/${req.file.filename}`;
    }

    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, owner: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    applyBodyToEmployee(employee, req.body);

    if (req.file) {
      // Remove the old photo file so uploads/employees doesn't accumulate stale images.
      if (employee.photo) {
        const oldPath = path.join(__dirname, "..", employee.photo.replace(/^\/+/, ""));
        fs.unlink(oldPath, () => {});
      }
      employee.photo = `/uploads/employees/${req.file.filename}`;
    }

    await employee.save();
    res.json(employee);
  } catch (err) {
    next(err);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, owner: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    if (employee.photo) {
      const oldPath = path.join(__dirname, "..", employee.photo.replace(/^\/+/, ""));
      fs.unlink(oldPath, () => {});
    }
    await employee.deleteOne();
    await Attendance.deleteMany({ owner: req.user._id, employee: employee._id });
    res.json({ message: "Employee removed" });
  } catch (err) {
    next(err);
  }
};

// Quick action from the employee list: record that a salary payment was made
// without opening the full edit form.
const recordSalaryPayment = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, owner: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    const { paymentStatus, lastPaymentDate } = req.body;
    if (!["Paid", "Pending", "Partial"].includes(paymentStatus)) {
      res.status(400);
      throw new Error("paymentStatus must be Paid, Pending, or Partial");
    }
    employee.salary.paymentStatus = paymentStatus;
    employee.salary.lastPaymentDate = lastPaymentDate || new Date();
    await employee.save();
    res.json(employee);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  recordSalaryPayment,
};
