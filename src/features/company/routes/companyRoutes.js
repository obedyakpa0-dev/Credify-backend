const express = require("express");
const companyController = require("../controllers/companyController");
const {
    requireAuth,
    requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles(["company", "admin"]));

router.get("/profile", companyController.getCompanyProfile);
router.patch("/profile", companyController.updateCompanyProfile);

module.exports = router;
