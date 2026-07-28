const express = require("express");
const ctrl = require("../controllers/productController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// Doc: admin va worker
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.get("/:id/stages", ctrl.listStages);

// Ghi: chi admin
router.post("/", requireRole("admin"), ctrl.create);
router.put("/:id", requireRole("admin"), ctrl.update);
router.delete("/:id", requireRole("admin"), ctrl.remove);
router.post("/:id/stages", requireRole("admin"), ctrl.createStage);
router.put("/:id/stages/:stageId", requireRole("admin"), ctrl.updateStage);
router.delete("/:id/stages/:stageId", requireRole("admin"), ctrl.removeStage);

module.exports = router;
