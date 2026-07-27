const express = require("express");
const ratingsController = require("../controllers/ratingsController");
const {
  requireAuth,
  requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

// Public — read project ratings and summaries
router.get("/project/:projectId", ratingsController.listProjectRatings);
router.get(
  "/project/:projectId/summary",
  ratingsController.getProjectRatingSummary
);

// Only companies and admins can submit ratings — students cannot self-rate
router.post(
  "/",
  requireAuth,
  requireRoles(["company", "admin"]),
  ratingsController.upsertRating
);

module.exports = router;
