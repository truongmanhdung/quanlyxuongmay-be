const express = require("express");
const ctrl = require("../controllers/payrollController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/summary", requireRole("admin"), ctrl.summary);
router.get("/defect-comparison", requireRole("admin"), ctrl.defectComparison);
router.get("/slips", requireRole("admin"), ctrl.listSlips);
router.get("/slips/:id/export", requireRole("admin"), ctrl.exportFile);
router.post("/export", requireRole("admin"), ctrl.exportSlip);
router.get("/", ctrl.detail); // worker: chinh minh; admin: ?worker=

module.exports = router;
