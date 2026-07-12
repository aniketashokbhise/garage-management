const express = require("express");
const router = express.Router();
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  recordSalaryPayment,
} = require("../controllers/employeeController");
const { protect } = require("../middleware/auth");
const uploadEmployeePhoto = require("../middleware/uploadEmployeePhoto");

router.use(protect);

router.route("/").get(getEmployees).post(uploadEmployeePhoto.single("photo"), createEmployee);
router
  .route("/:id")
  .get(getEmployeeById)
  .put(uploadEmployeePhoto.single("photo"), updateEmployee)
  .delete(deleteEmployee);
router.put("/:id/salary-payment", recordSalaryPayment);

module.exports = router;
