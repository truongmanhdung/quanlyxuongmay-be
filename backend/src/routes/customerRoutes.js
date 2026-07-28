const express = require("express");
const ctrl = require("../controllers/customerController");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);
// Doc du lieu: admin va worker (worker can chon khach hang khi gui san luong)
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
// Ghi du lieu: chi admin
router.post("/", requireRole("admin"), ctrl.create);
router.put("/:id", requireRole("admin"), ctrl.update);
router.delete("/:id", requireRole("admin"), ctrl.remove);

module.exports = router;
