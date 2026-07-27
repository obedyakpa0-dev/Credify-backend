const express = require("express");
const certificatesController = require("../controllers/certificatesController");
const {
  requireAuth,
  requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

// All certificate routes require authentication
router.use(requireAuth);

// Students/graduates can list their own certificates; admins see all
router.get("/", certificatesController.listCertificates);

// Authenticated users can fetch a specific certificate by ID
router.get("/:certificateId", certificatesController.getCertificateById);

// Only admins can manually create certificate records (auto-creation via payment webhook)
router.post(
  "/",
  requireRoles(["admin"]),
  certificatesController.createCertificate
);

module.exports = router;
