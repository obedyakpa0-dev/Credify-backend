const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { requireAuth } = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/summary", dashboardController.getSummary);

module.exports = router;
