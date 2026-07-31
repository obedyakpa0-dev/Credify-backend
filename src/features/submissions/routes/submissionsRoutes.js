const express = require("express");
const submissionsController = require("../controllers/submissionsController");
const {
  requireAuth,
  requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

// Only students and graduates can start (create) submissions
router.post(
  "/",
  requireRoles(["student", "graduate"]),
  submissionsController.createSubmission,
);
router.get("/", submissionsController.listSubmissions);
router.get("/:submissionId", submissionsController.getSubmissionById);

// Students/graduates update their own submission content (draft edits, then Submit Work)
router.patch(
  "/:submissionId",
  requireRoles(["student", "graduate"]),
  submissionsController.updateSubmission,
);

// Students/graduates can remove a project they haven't submitted yet
router.delete(
  "/:submissionId",
  requireRoles(["student", "graduate"]),
  submissionsController.deleteSubmission,
);

// Review submission status (Company / Admin)
router.patch(
  "/:submissionId/status",
  requireRoles(["admin", "company"]),
  submissionsController.updateSubmissionStatus,
);

// Rate submission (Company)
router.post(
  "/:submissionId/rate",
  requireRoles(["admin", "company"]),
  submissionsController.rateSubmission,
);

module.exports = router;
