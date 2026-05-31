const mongoose = require("mongoose");
const LeaderboardEntry = require("../models/leaderboardModel");
const { createHttpError } = require("../../../common/http");

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const toLeaderboardResponse = (entryDocument) => ({
  id: entryDocument._id.toString(),
  userId: entryDocument.userId.toString(),
  displayName: entryDocument.displayName,
  points: entryDocument.points,
  badgesCount: entryDocument.badgesCount,
  completedCourses: entryDocument.completedCourses,
  createdAt: entryDocument.createdAt,
  updatedAt: entryDocument.updatedAt,
});

const upsertEntry = async ({
  userId,
  displayName,
  points,
  badgesCount,
  completedCourses,
} = {}) => {
  if (!userId || !displayName) {
    throw createHttpError(400, "userId and displayName are required");
  }

  assertObjectId(userId, "userId");

  const updatePayload = {
    displayName: displayName.trim(),
  };

  if (points !== undefined) {
    updatePayload.points = points;
  }

  if (badgesCount !== undefined) {
    updatePayload.badgesCount = badgesCount;
  }

  if (completedCourses !== undefined) {
    updatePayload.completedCourses = completedCourses;
  }

  const entry = await LeaderboardEntry.findOneAndUpdate(
    { userId },
    { $set: updatePayload, $setOnInsert: { userId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return toLeaderboardResponse(entry);
};

const getTopEntries = async ({ limit = 10 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const entries = await LeaderboardEntry.find()
    .sort({ points: -1, badgesCount: -1, completedCourses: -1, updatedAt: 1 })
    .limit(safeLimit);

  return entries.map(toLeaderboardResponse);
};

const getEntryByUserId = async (userId) => {
  if (!userId) {
    throw createHttpError(400, "userId is required");
  }

  assertObjectId(userId, "userId");

  const entry = await LeaderboardEntry.findOne({ userId });
  if (!entry) {
    throw createHttpError(404, "Leaderboard entry not found");
  }

  return toLeaderboardResponse(entry);
};

module.exports = {
  upsertEntry,
  getTopEntries,
  getEntryByUserId,
};
