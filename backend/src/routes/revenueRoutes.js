const express = require("express");
const ctrl = require("../controllers/revenueController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/summary", requireRole("admin"), ctrl.summary);
router.get("/slips", requireRole("admin"), ctrl.listSlips);
router.get("/slips/:id/export", requireRole("admin"), ctrl.exportFile);
router.post("/export", requireRole("admin"), ctrl.exportSlip);
router.get("/", requireRole("admin"), ctrl.detail);

module.exports = router;
