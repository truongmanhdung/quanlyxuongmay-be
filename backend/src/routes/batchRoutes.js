const express = require("express");
const ctrl = require("../controllers/batchController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireRole("admin"));
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.patch("/:id/complete", ctrl.complete);
router.delete("/:id", ctrl.remove);

module.exports = router;
