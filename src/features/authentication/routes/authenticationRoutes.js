const express = require("express");
const authenticationController = require("../controllers/authenticationController");
const { requireAuth } = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.post("/register", authenticationController.register);
router.post("/login", authenticationController.login);
router.post("/forgot-password", authenticationController.requestPasswordReset);
router.post("/reset-password", authenticationController.resetPassword);
router.get("/verify-email", authenticationController.verifyEmail);
router.post("/verify-otp", authenticationController.verifyOtp);
router.post("/resend-otp", authenticationController.resendOtp);
router.post("/resend-verification", authenticationController.resendVerification);
router.get("/me", requireAuth, authenticationController.getMe);
router.put("/profile", requireAuth, authenticationController.updateProfile);

module.exports = router;

