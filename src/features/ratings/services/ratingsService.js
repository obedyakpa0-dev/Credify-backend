const mongoose = require("mongoose");
const Rating = require("../models/ratingsModel");
const Project = require("../../projects/models/projectsModel");
const { createHttpError } = require("../../../common/http");
const {
  RATING_POINTS,
  RATING_COLORS,
} = require("../../../shared/constants/ratingConstants");

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const normalizeRatingColor = (input) => {
  if (typeof input !== "string") {
    return null;
  }

  const normalizedColor = input.trim().toLowerCase();

  if (!RATING_COLORS.includes(normalizedColor)) {
    return null;
  }

  return normalizedColor;
};

const toRatingResponse = (ratingDocument) => ({
  id: ratingDocument._id.toString(),
  projectId: ratingDocument.projectId.toString(),
  raterId: ratingDocument.raterId.toString(),
  rating: ratingDocument.rating,
  points: ratingDocument.points,
  comment: ratingDocument.comment,
  createdAt: ratingDocument.createdAt,
  updatedAt: ratingDocument.updatedAt,
});

const upsertRating = async ({ projectId, rating, comment } = {}, currentUser) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  if (!projectId || rating === undefined) {
    throw createHttpError(400, "projectId and rating are required");
  }

  assertObjectId(projectId, "projectId");

  const normalizedRating = normalizeRatingColor(rating);
  if (!normalizedRating) {
    throw createHttpError(400, `rating must be one of: ${RATING_COLORS.join(", ")}`);
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  const ratingDocument = await Rating.findOneAndUpdate(
    { projectId, raterId: currentUser.id },
    {
      $set: {
        projectId,
        raterId: currentUser.id,
        rating: normalizedRating,
        points: RATING_POINTS[normalizedRating],
        comment: typeof comment === "string" ? comment.trim() : "",
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return toRatingResponse(ratingDocument);
};

const listProjectRatings = async (projectId, { limit = 20, page = 1 } = {}) => {
  if (!projectId) {
    throw createHttpError(400, "projectId is required");
  }

  assertObjectId(projectId, "projectId");

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Rating.find({ projectId }).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Rating.countDocuments({ projectId }),
  ]);

  return {
    items: items.map(toRatingResponse),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
    },
  };
};

const getProjectRatingSummary = async (projectId) => {
  if (!projectId) {
    throw createHttpError(400, "projectId is required");
  }

  assertObjectId(projectId, "projectId");

  const [summary] = await Rating.aggregate([
    { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: "$projectId",
        averagePoints: { $avg: "$points" },
        totalPoints: { $sum: "$points" },
        totalRatings: { $sum: 1 },
        green: { $sum: { $cond: [{ $eq: ["$rating", "green"] }, 1, 0] } },
        yellow: { $sum: { $cond: [{ $eq: ["$rating", "yellow"] }, 1, 0] } },
        red: { $sum: { $cond: [{ $eq: ["$rating", "red"] }, 1, 0] } },
      },
    },
  ]);

  if (!summary) {
    return {
      projectId,
      averagePoints: 0,
      totalPoints: 0,
      totalRatings: 0,
      distribution: { green: 0, yellow: 0, red: 0 },
    };
  }

  return {
    projectId,
    averagePoints: Number(summary.averagePoints.toFixed(2)),
    totalPoints: summary.totalPoints,
    totalRatings: summary.totalRatings,
    distribution: {
      green: summary.green,
      yellow: summary.yellow,
      red: summary.red,
    },
  };
};

module.exports = {
  upsertRating,
  listProjectRatings,
  getProjectRatingSummary,
};
