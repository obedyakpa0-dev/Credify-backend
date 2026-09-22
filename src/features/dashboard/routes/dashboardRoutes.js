const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { requireAuth, requireRoles } = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles(["admin"]));

router.get("/summary", dashboardController.getSummary);

module.exports = router;
