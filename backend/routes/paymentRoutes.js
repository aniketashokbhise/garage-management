const express = require("express");
const router = express.Router();
const { getPayments } = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/", getPayments);

module.exports = router;
