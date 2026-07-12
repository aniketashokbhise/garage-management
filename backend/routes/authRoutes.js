const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getMe, updateProfile } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const uploadLogo = require("../middleware/uploadLogo");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.put("/profile", protect, uploadLogo.single("logo"), updateProfile);

module.exports = router;
