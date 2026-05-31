const express = require("express");
const submissionsController = require("../controllers/submissionsController");
const {
  requireAuth,
  requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", submissionsController.createSubmission);
router.get("/", submissionsController.listSubmissions);
router.get("/:submissionId", submissionsController.getSubmissionById);
router.patch(
  "/:submissionId/status",
  requireRoles(["admin", "company"]),
  submissionsController.updateSubmissionStatus
);

module.exports = router;
