const express = require("express");
const profileController = require("../controllers/profileController");

const router = express.Router();

router.get("/", profileController.listProfiles);
router.get("/:userId", profileController.getProfileByUserId);
router.put("/", profileController.upsertProfile);

module.exports = router;
