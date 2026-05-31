const express = require("express");
const projectsController = require("../controllers/projectsController");
const { requireAuth } = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.get("/", projectsController.listProjects);
router.get("/:projectId", projectsController.getProjectById);
router.post("/", requireAuth, projectsController.createProject);
router.patch("/:projectId", requireAuth, projectsController.updateProject);

module.exports = router;
