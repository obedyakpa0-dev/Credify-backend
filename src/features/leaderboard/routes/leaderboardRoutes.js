const express = require("express");
const leaderboardController = require("../controllers/leaderboardController");
const { requireAuth } = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.get("/top", leaderboardController.getTopEntries);
router.get("/:userId", leaderboardController.getEntryByUserId);
router.put("/entry", requireAuth, leaderboardController.upsertEntry);

module.exports = router;
