const express = require("express");
const { adminLogin, workerLogin, me, changePassword, registerFcmToken } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/admin/login", adminLogin);
router.post("/worker/login", workerLogin);
router.get("/me", authenticate, me);
router.patch("/admin/change-password", authenticate, changePassword);
router.patch("/fcm-token", authenticate, registerFcmToken);

module.exports = router;
