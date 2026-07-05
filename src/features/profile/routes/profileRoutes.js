const express = require("express");
const profileController = require("../controllers/profileController");
const { requireAuth } = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.get("/", profileController.listProfiles);
router.get("/:userId", profileController.getProfileByUserId);
router.put("/", requireAuth, profileController.upsertProfile);

module.exports = router;
