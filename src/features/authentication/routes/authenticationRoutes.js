const express = require("express");
const authenticationController = require("../controllers/authenticationController");

const router = express.Router();

router.post("/register", authenticationController.register);
router.post("/login", authenticationController.login);
router.get("/me", authenticationController.getMe);

module.exports = router;
