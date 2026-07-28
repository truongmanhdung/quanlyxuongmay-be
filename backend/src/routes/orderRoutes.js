const express = require("express");
const ctrl = require("../controllers/orderController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireRole("admin"));
router.get("/", ctrl.list);
router.get("/stock", ctrl.stock);
router.get("/stock-summary", ctrl.stockSummary);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/details", ctrl.addDetail);
router.put("/:id/details/:detailId", ctrl.updateDetail);
router.delete("/:id/details/:detailId", ctrl.removeDetail);

module.exports = router;
