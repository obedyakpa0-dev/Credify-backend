const express = require("express");
const ratingsController = require("../controllers/ratingsController");
const { requireAuth } = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.get("/project/:projectId", ratingsController.listProjectRatings);
router.get("/project/:projectId/summary", ratingsController.getProjectRatingSummary);
router.post("/", requireAuth, ratingsController.upsertRating);

module.exports = router;
