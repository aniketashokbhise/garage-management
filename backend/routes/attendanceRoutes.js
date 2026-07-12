const express = require("express");
const router = express.Router();
const {
  markAttendance,
  getAttendanceHistory,
  getMonthlySummary,
  deleteAttendance,
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getAttendanceHistory).post(markAttendance);
router.get("/summary", getMonthlySummary);
router.delete("/:id", deleteAttendance);

module.exports = router;
