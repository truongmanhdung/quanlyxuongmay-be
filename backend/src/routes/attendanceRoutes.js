const express = require("express");
const ctrl = require("../controllers/attendanceController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.post("/check-in", requireRole("worker"), ctrl.checkIn);
router.post("/check-out", requireRole("worker"), ctrl.checkOut);
router.get("/today", requireRole("worker"), ctrl.today);
router.get("/mine", requireRole("worker"), ctrl.mine);

router.get("/day", requireRole("admin"), ctrl.day);
router.get("/summary", requireRole("admin"), ctrl.summary);
router.get("/", requireRole("admin"), ctrl.list);

module.exports = router;
