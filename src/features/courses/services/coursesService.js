const mongoose = require("mongoose");
const Course = require("../models/coursesModel");
const { createHttpError } = require("../../../common/http");

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const toCourseResponse = (courseDocument) => ({
  id: courseDocument._id.toString(),
  title: courseDocument.title,
  description: courseDocument.description,
  category: courseDocument.category,
  level: courseDocument.level,
  points: courseDocument.points,
  durationHours: courseDocument.durationHours,
  isPublished: courseDocument.isPublished,
  createdAt: courseDocument.createdAt,
  updatedAt: courseDocument.updatedAt,
});

const createCourse = async ({
  title,
  description,
  category,
  level,
  points,
  durationHours,
  isPublished,
} = {}) => {
  if (!title || typeof title !== "string") {
    throw createHttpError(400, "title is required");
  }

  const createdCourse = await Course.create({
    title: title.trim(),
    description,
    category,
    level,
    points,
    durationHours,
    isPublished,
  });

  return toCourseResponse(createdCourse);
};

const listCourses = async ({ publishedOnly = false, limit = 20, page = 1 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  const filter = publishedOnly ? { isPublished: true } : {};

  const [courses, total] = await Promise.all([
    Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Course.countDocuments(filter),
  ]);

  return {
    items: courses.map(toCourseResponse),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
    },
  };
};

const getCourseById = async (courseId) => {
  if (!courseId) {
    throw createHttpError(400, "courseId is required");
  }

  assertObjectId(courseId, "courseId");

  const course = await Course.findById(courseId);

  if (!course) {
    throw createHttpError(404, "Course not found");
  }

  return toCourseResponse(course);
};

const updateCourse = async (courseId, updates = {}) => {
  if (!courseId) {
    throw createHttpError(400, "courseId is required");
  }

  assertObjectId(courseId, "courseId");

  const allowedFields = [
    "title",
    "description",
    "category",
    "level",
    "points",
    "durationHours",
    "isPublished",
  ];

  const updatePayload = allowedFields.reduce((accumulator, key) => {
    if (updates[key] !== undefined) {
      accumulator[key] = updates[key];
    }
    return accumulator;
  }, {});

  if (updatePayload.title && typeof updatePayload.title === "string") {
    updatePayload.title = updatePayload.title.trim();
  }

  if (Object.keys(updatePayload).length === 0) {
    throw createHttpError(400, "At least one updatable field is required");
  }

  const updatedCourse = await Course.findByIdAndUpdate(courseId, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!updatedCourse) {
    throw createHttpError(404, "Course not found");
  }

  return toCourseResponse(updatedCourse);
};

module.exports = {
  createCourse,
  listCourses,
  getCourseById,
  updateCourse,
};
