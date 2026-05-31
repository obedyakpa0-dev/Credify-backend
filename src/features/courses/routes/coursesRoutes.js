const express = require("express");
const coursesController = require("../controllers/coursesController");

const router = express.Router();

router.post("/", coursesController.createCourse);
router.get("/", coursesController.listCourses);
router.get("/:courseId", coursesController.getCourseById);
router.patch("/:courseId", coursesController.updateCourse);

module.exports = router;
