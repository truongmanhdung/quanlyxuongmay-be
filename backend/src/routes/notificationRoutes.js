const express = require("express");
const ctrl = require("../controllers/notificationController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/mine", authenticate, requireRole("worker"), ctrl.mine);
router.patch("/:id/read", authenticate, requireRole("worker"), ctrl.markRead);
router.post("/remind", authenticate, requireRole("admin"), ctrl.remind);

module.exports = router;
