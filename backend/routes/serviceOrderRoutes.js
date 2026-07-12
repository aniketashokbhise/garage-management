const express = require("express");
const router = express.Router();
const {
  getServiceOrders,
  getServiceOrderById,
  createServiceOrder,
  updateServiceOrderStatus,
  updateServiceOrder,
  deleteServiceOrder,
} = require("../controllers/serviceOrderController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getServiceOrders).post(createServiceOrder);
router.route("/:id").get(getServiceOrderById).put(updateServiceOrder).delete(deleteServiceOrder);
router.patch("/:id/status", updateServiceOrderStatus);

module.exports = router;
