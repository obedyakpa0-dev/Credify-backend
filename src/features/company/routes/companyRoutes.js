const express = require("express");
const companyController = require("../controllers/companyController");

const router = express.Router();

router.get("/profile", companyController.getCompanyProfile);
router.patch("/profile", companyController.updateCompanyProfile);

module.exports = router;
