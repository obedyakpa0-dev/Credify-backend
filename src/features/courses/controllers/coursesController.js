const coursesService = require("../services/coursesService");
const { sendSuccess, sendError } = require("../../../common/http");

const createCourse = async (req, res) => {
  try {
    const course = await coursesService.createCourse(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Course created successfully",
      data: { course },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const listCourses = async (req, res) => {
  try {
    const publishedOnly =
      req.query.publishedOnly === "true" || req.query.publishedOnly === true;
    const data = await coursesService.listCourses({ ...req.query, publishedOnly });
    return sendSuccess(res, {
      message: "Courses retrieved successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await coursesService.getCourseById(req.params.courseId);
    return sendSuccess(res, {
      message: "Course retrieved successfully",
      data: { course },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateCourse = async (req, res) => {
  try {
    const course = await coursesService.updateCourse(req.params.courseId, req.body);
    return sendSuccess(res, {
      message: "Course updated successfully",
      data: { course },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createCourse,
  listCourses,
  getCourseById,
  updateCourse,
};
