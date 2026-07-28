const express = require("express");
const reminderCtrl = require("../controllers/reminderSettingController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireRole("admin"));
router.get("/reminder", reminderCtrl.get);
router.put("/reminder", reminderCtrl.update);

module.exports = router;
