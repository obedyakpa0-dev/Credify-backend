const mongoose = require("mongoose");
const Badge = require("../models/badgesModel");
const { createHttpError } = require("../../../common/http");

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const toBadgeResponse = (badgeDocument) => ({
  id: badgeDocument._id.toString(),
  name: badgeDocument.name,
  description: badgeDocument.description,
  iconUrl: badgeDocument.iconUrl,
  pointsRequired: badgeDocument.pointsRequired,
  category: badgeDocument.category,
  createdAt: badgeDocument.createdAt,
  updatedAt: badgeDocument.updatedAt,
});

const createBadge = async ({
  name,
  description,
  iconUrl,
  pointsRequired,
  category,
} = {}) => {
  if (!name || typeof name !== "string") {
    throw createHttpError(400, "name is required");
  }

  const existingBadge = await Badge.findOne({ name: name.trim() });
  if (existingBadge) {
    throw createHttpError(409, "A badge with this name already exists");
  }

  const createdBadge = await Badge.create({
    name: name.trim(),
    description,
    iconUrl,
    pointsRequired,
    category,
  });

  return toBadgeResponse(createdBadge);
};

const listBadges = async ({ limit = 20, page = 1 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [badges, total] = await Promise.all([
    Badge.find().sort({ pointsRequired: -1 }).skip(skip).limit(safeLimit),
    Badge.countDocuments(),
  ]);

  return {
    items: badges.map(toBadgeResponse),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
    },
  };
};

const getBadgeById = async (badgeId) => {
  if (!badgeId) {
    throw createHttpError(400, "badgeId is required");
  }

  assertObjectId(badgeId, "badgeId");

  const badge = await Badge.findById(badgeId);
  if (!badge) {
    throw createHttpError(404, "Badge not found");
  }

  return toBadgeResponse(badge);
};

const updateBadge = async (badgeId, updates = {}) => {
  if (!badgeId) {
    throw createHttpError(400, "badgeId is required");
  }

  assertObjectId(badgeId, "badgeId");

  const allowedFields = ["name", "description", "iconUrl", "pointsRequired", "category"];
  const updatePayload = allowedFields.reduce((accumulator, key) => {
    if (updates[key] !== undefined) {
      accumulator[key] = updates[key];
    }
    return accumulator;
  }, {});

  if (updatePayload.name && typeof updatePayload.name === "string") {
    updatePayload.name = updatePayload.name.trim();
  }

  if (Object.keys(updatePayload).length === 0) {
    throw createHttpError(400, "At least one updatable field is required");
  }

  const updatedBadge = await Badge.findByIdAndUpdate(badgeId, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!updatedBadge) {
    throw createHttpError(404, "Badge not found");
  }

  return toBadgeResponse(updatedBadge);
};

module.exports = {
  createBadge,
  listBadges,
  getBadgeById,
  updateBadge,
};
