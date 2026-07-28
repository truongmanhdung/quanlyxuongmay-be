const express = require("express");
const ctrl = require("../controllers/defectController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireRole("admin"));
router.get("/", ctrl.list);
router.get("/summary", ctrl.summary);
router.get("/workers-for-stage", ctrl.workersForStage);
router.get("/comparison", ctrl.comparison);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
