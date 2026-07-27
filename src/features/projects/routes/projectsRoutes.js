const express = require("express");
const projectsController = require("../controllers/projectsController");
const {
  requireAuth,
  requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.get("/", projectsController.listProjects);
router.get(
  "/mine",
  requireAuth,
  requireRoles(["company"]),
  projectsController.listMyProjects
);
router.get("/:projectId", projectsController.getProjectById);

router.post(
  "/",
  requireAuth,
  requireRoles(["company", "admin"]),
  projectsController.createProject
);
router.patch(
  "/:projectId",
  requireAuth,
  requireRoles(["company", "admin"]),
  projectsController.updateProject
);
router.delete(
  "/:projectId",
  requireAuth,
  requireRoles(["company", "admin"]),
  projectsController.deleteProject
);

module.exports = router;
