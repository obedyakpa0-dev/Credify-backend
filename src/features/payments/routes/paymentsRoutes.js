const express = require("express");
const paymentsController = require("../controllers/paymentsController");
const {
  requireAuth,
  requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.post("/webhook", paymentsController.paystackWebhook);
router.get("/callback", paymentsController.paymentCallback);
router.post("/callback", paymentsController.paymentCallback);

router.use(requireAuth);

router.post("/paystack/initialize", paymentsController.initializePaystackPayment);
router.get("/paystack/verify/:reference", paymentsController.verifyPaystackPayment);
router.post("/", paymentsController.createPayment);
router.get("/", paymentsController.listPayments);
router.patch(
  "/:paymentId/status",
  requireRoles(["admin", "company"]),
  paymentsController.updatePaymentStatus
);

module.exports = router;
