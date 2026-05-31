const express = require("express");
const badgesController = require("../controllers/badgesController");

const router = express.Router();

router.post("/", badgesController.createBadge);
router.get("/", badgesController.listBadges);
router.get("/:badgeId", badgesController.getBadgeById);
router.patch("/:badgeId", badgesController.updateBadge);

module.exports = router;
