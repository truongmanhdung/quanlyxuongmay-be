const express = require("express");
const reminderCtrl = require("../controllers/reminderSettingController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireRole("admin"));
router.get("/reminder", reminderCtrl.get);
router.put("/reminder", reminderCtrl.update);
router.get("/reminder/workers", reminderCtrl.listWorkerOverrides);
router.put("/reminder/workers/:workerId", reminderCtrl.upsertWorkerOverride);
router.delete("/reminder/workers/:workerId", reminderCtrl.removeWorkerOverride);

module.exports = router;
