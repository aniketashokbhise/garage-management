const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

// Truncates any date input (a "YYYY-MM-DD" string, ISO string, or Date) down to a UTC
// midnight timestamp, so "one calendar day" always means the same thing regardless of
// what time of day a request comes in.
const toUTCDay = (input) => {
  const d = input ? new Date(input) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const monthRange = (monthStr) => {
  // monthStr like "2026-07"; defaults to the current month.
  let year, month;
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    [year, month] = monthStr.split("-").map(Number);
    month -= 1;
  } else {
    const now = new Date();
    year = now.getUTCFullYear();
    month = now.getUTCMonth();
  }
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { start, end };
};

// Recomputes the cached present/absent/leave/percentage fields on the Employee document
// for the current calendar month, so the Employee list/detail pages can show an
// at-a-glance summary without hitting the Attendance collection every time.
const recalcCurrentMonthAttendance = async (employeeId, ownerId) => {
  const { start, end } = monthRange();
  const counts = await Attendance.aggregate([
    { $match: { owner: ownerId, employee: employeeId, date: { $gte: start, $lt: end } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const tally = { Present: 0, Absent: 0, Leave: 0 };
  counts.forEach((c) => {
    tally[c._id] = c.count;
  });
  const total = tally.Present + tally.Absent + tally.Leave;
  const percentage = total > 0 ? Math.round((tally.Present / total) * 1000) / 10 : 0;

  await Employee.findByIdAndUpdate(employeeId, {
    $set: {
      "attendance.presentDays": tally.Present,
      "attendance.absentDays": tally.Absent,
      "attendance.leaveDays": tally.Leave,
      "attendance.attendancePercentage": percentage,
    },
  });
};

// @desc Mark (or correct) an employee's attendance for a given day.
// Upserting on the (owner, employee, date) unique index is what prevents duplicate
// records for the same employee/day -- a second call for the same day updates the
// existing record's status instead of creating a new one.
const markAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, status } = req.body;
    if (!employeeId || !status) {
      res.status(400);
      throw new Error("employeeId and status are required");
    }
    if (!["Present", "Absent", "Leave"].includes(status)) {
      res.status(400);
      throw new Error("status must be Present, Absent, or Leave");
    }

    const employee = await Employee.findOne({ _id: employeeId, owner: req.user._id });
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    const day = toUTCDay(date);
    const record = await Attendance.findOneAndUpdate(
      { owner: req.user._id, employee: employee._id, date: day },
      { owner: req.user._id, employee: employee._id, date: day, status },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await recalcCurrentMonthAttendance(employee._id, req.user._id);

    res.status(201).json(record);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400);
      next(new Error("Attendance for this employee and date already exists"));
      return;
    }
    next(err);
  }
};

// @desc View attendance history, filterable by employee, an exact date, and/or a month.
const getAttendanceHistory = async (req, res, next) => {
  try {
    const { employeeId, date, month } = req.query;
    const query = { owner: req.user._id };
    if (employeeId) query.employee = employeeId;

    if (date) {
      const day = toUTCDay(date);
      const next_ = new Date(day);
      next_.setUTCDate(next_.getUTCDate() + 1);
      query.date = { $gte: day, $lt: next_ };
    } else if (month) {
      const { start, end } = monthRange(month);
      query.date = { $gte: start, $lt: end };
    }

    const records = await Attendance.find(query)
      .populate("employee", "name employeeId jobRole photo")
      .sort({ date: -1, createdAt: -1 });

    res.json(records);
  } catch (err) {
    next(err);
  }
};

// @desc Monthly attendance summary across all employees (or one employee), including
// total Present/Absent/Leave days and attendance percentage for the month.
const getMonthlySummary = async (req, res, next) => {
  try {
    const { month, employeeId, jobRole, status } = req.query;
    const { start, end } = monthRange(month);

    const employeeQuery = { owner: req.user._id };
    if (employeeId) employeeQuery._id = employeeId;
    if (jobRole) employeeQuery.jobRole = jobRole;
    if (status) employeeQuery.status = status;
    const employees = await Employee.find(employeeQuery).select("name employeeId jobRole photo");

    const matchStage = { owner: req.user._id, date: { $gte: start, $lt: end } };
    if (employeeId) matchStage.employee = new mongoose.Types.ObjectId(employeeId);

    const counts = await Attendance.aggregate([
      { $match: matchStage },
      { $group: { _id: { employee: "$employee", status: "$status" }, count: { $sum: 1 } } },
    ]);

    const tallyByEmployee = {};
    counts.forEach((c) => {
      const empId = String(c._id.employee);
      if (!tallyByEmployee[empId]) tallyByEmployee[empId] = { Present: 0, Absent: 0, Leave: 0 };
      tallyByEmployee[empId][c._id.status] = c.count;
    });

    const summary = employees.map((emp) => {
      const tally = tallyByEmployee[String(emp._id)] || { Present: 0, Absent: 0, Leave: 0 };
      const total = tally.Present + tally.Absent + tally.Leave;
      const attendancePercentage = total > 0 ? Math.round((tally.Present / total) * 1000) / 10 : 0;
      return {
        employee: emp,
        presentDays: tally.Present,
        absentDays: tally.Absent,
        leaveDays: tally.Leave,
        attendancePercentage,
      };
    });

    res.json({ month: month || monthRange().start.toISOString().slice(0, 7), summary });
  } catch (err) {
    next(err);
  }
};

// @desc Remove a mistakenly-marked attendance record.
const deleteAttendance = async (req, res, next) => {
  try {
    const record = await Attendance.findOne({ _id: req.params.id, owner: req.user._id });
    if (!record) {
      res.status(404);
      throw new Error("Attendance record not found");
    }
    await record.deleteOne();
    await recalcCurrentMonthAttendance(record.employee, req.user._id);
    res.json({ message: "Attendance record removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  markAttendance,
  getAttendanceHistory,
  getMonthlySummary,
  deleteAttendance,
};
