const express = require("express");
const certificatesController = require("../controllers/certificatesController");
const {
    requireAuth,
    requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.get("/", certificatesController.listCertificates);
router.get("/:certificateId", certificatesController.getCertificateById);
router.post(
    "/",
    requireAuth,
    requireRoles(["admin", "company"]),
    certificatesController.createCertificate
);

module.exports = router;
