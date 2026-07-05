const express = require("express");
const adminController = require("../controllers/adminController");
const {
  requireAuth,
  requireRoles,
} = require("../../../shared/middleware/authMiddleware");
const { getAllProjectsAdmin, deleteProjectAdmin } = require("../services/adminService");

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
router.get('/projects', getAllProjectsAdmin);
router.delete('/project/projectId', deleteProjectAdmin)
//router.get("/ratings", adminController.getRatings);
//router.delete("/ratings/:ratingId", adminController.deleteRating);
router.get("/projects", adminController.getProjects);
//router.patch(
  //"/projects/:projectId/approval",
  //adminController.updateProjectApproval,
//);

module.exports = router;
