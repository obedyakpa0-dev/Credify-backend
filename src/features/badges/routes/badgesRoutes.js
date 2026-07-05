const express = require("express");
const badgesController = require("../controllers/badgesController");
const {
    requireAuth,
    requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.get("/", badgesController.listBadges);
router.get("/:badgeId", badgesController.getBadgeById);
router.post(
    "/",
    requireAuth,
    requireRoles(["admin"]),
    badgesController.createBadge
);
router.patch(
    "/:badgeId",
    requireAuth,
    requireRoles(["admin"]),
    badgesController.updateBadge
);

module.exports = router;
