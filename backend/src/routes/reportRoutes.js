const express = require("express");
const ctrl = require("../controllers/reportController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.post("/", requireRole("worker"), ctrl.create);
router.get("/mine", requireRole("worker"), ctrl.mine);
router.get("/recent", requireRole("admin"), ctrl.recent);
router.get("/", requireRole("admin"), ctrl.list);
router.get("/:id", ctrl.getOne);
router.patch("/:id/status", requireRole("admin"), ctrl.setStatus);

module.exports = router;
