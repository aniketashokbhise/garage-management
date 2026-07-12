const express = require("express");
const router = express.Router();
const {
  getParts,
  getLowStockParts,
  createPart,
  updatePart,
  restockPart,
  deletePart,
  getInventoryHistory,
  getPartHistory,
} = require("../controllers/partController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/low-stock", getLowStockParts);
router.get("/history", getInventoryHistory);
router.route("/").get(getParts).post(createPart);
router.route("/:id").put(updatePart).delete(deletePart);
router.post("/:id/restock", restockPart);
router.get("/:id/history", getPartHistory);

module.exports = router;
