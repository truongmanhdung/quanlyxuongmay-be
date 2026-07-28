const express = require("express");
const ctrl = require("../controllers/dashboardController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/overview", authenticate, requireRole("admin"), ctrl.overview);

module.exports = router;
