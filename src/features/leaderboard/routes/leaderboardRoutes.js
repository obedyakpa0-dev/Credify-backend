const express = require("express");
const leaderboardController = require("../controllers/leaderboardController");

const router = express.Router();

router.put("/entry", leaderboardController.upsertEntry);
router.get("/top", leaderboardController.getTopEntries);
router.get("/:userId", leaderboardController.getEntryByUserId);

module.exports = router;
