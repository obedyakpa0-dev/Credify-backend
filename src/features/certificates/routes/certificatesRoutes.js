const express = require("express");
const certificatesController = require("../controllers/certificatesController");

const router = express.Router();

router.post("/", certificatesController.createCertificate);
router.get("/", certificatesController.listCertificates);
router.get("/:certificateId", certificatesController.getCertificateById);

module.exports = router;
