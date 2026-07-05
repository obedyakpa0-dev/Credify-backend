const express = require("express");
const coursesController = require("../controllers/coursesController");
const {
    requireAuth,
    requireRoles,
} = require("../../../shared/middleware/authMiddleware");

const router = express.Router();

router.get("/", coursesController.listCourses);
router.get("/:courseId", coursesController.getCourseById);
router.post(
    "/",
    requireAuth,
    requireRoles(["admin", "company"]),
    coursesController.createCourse
);
router.patch(
    "/:courseId",
    requireAuth,
    requireRoles(["admin", "company"]),
    coursesController.updateCourse
);

module.exports = router;
