const express = require("express");
const adminController = require("../controllers/adminController");
const {
  requireAuth,
  requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles(["admin"]));

router.get("/overview", adminController.getOverview);
router.get("/users", adminController.getUsers);
router.patch("/users/:userId", adminController.updateUser);
router.get("/submissions", adminController.getSubmissions);
router.patch(
  "/submissions/:submissionId/review",
  adminController.reviewSubmission,
);
router.post("/submissions/:submissionId/rate", adminController.rateSubmission);

router.get("/projects", adminController.getProjects);
router.delete("/projects/:projectId", adminController.deleteProject);
router.patch(
  "/projects/:projectId/approval",
  adminController.updateProjectApproval,
);

router.get("/ratings", adminController.getRatings);
router.delete("/ratings/:ratingId", adminController.deleteRating);

router.get("/certificates", adminController.getCertificates);

module.exports = router;

