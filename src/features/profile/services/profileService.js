const mongoose = require("mongoose");
const Profile = require("../models/profileModel");
const { createHttpError } = require("../../../common/http");

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const toProfileResponse = (profileDocument) => ({
  id: profileDocument._id.toString(),
  userId: profileDocument.userId.toString(),
  headline: profileDocument.headline,
  bio: profileDocument.bio,
  skills: profileDocument.skills,
  location: profileDocument.location,
  website: profileDocument.website,
  avatarUrl: profileDocument.avatarUrl,
  createdAt: profileDocument.createdAt,
  updatedAt: profileDocument.updatedAt,
});

const listProfiles = async ({ limit = 20, page = 1 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [profiles, total] = await Promise.all([
    Profile.find().sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Profile.countDocuments(),
  ]);

  return {
    items: profiles.map(toProfileResponse),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
    },
  };
};

const getProfileByUserId = async (userId) => {
  if (!userId) {
    throw createHttpError(400, "userId is required");
  }

  assertObjectId(userId, "userId");

  const profile = await Profile.findOne({ userId });

  if (!profile) {
    throw createHttpError(404, "Profile not found");
  }

  return toProfileResponse(profile);
};

const upsertProfile = async ({
  userId,
  headline,
  bio,
  skills,
  location,
  website,
  avatarUrl,
} = {}) => {
  if (!userId) {
    throw createHttpError(400, "userId is required");
  }

  assertObjectId(userId, "userId");

  const updatePayload = {};

  if (typeof headline === "string") {
    updatePayload.headline = headline.trim();
  }

  if (typeof bio === "string") {
    updatePayload.bio = bio.trim();
  }

  if (Array.isArray(skills)) {
    updatePayload.skills = skills
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof location === "string") {
    updatePayload.location = location.trim();
  }

  if (typeof website === "string") {
    updatePayload.website = website.trim();
  }

  if (typeof avatarUrl === "string") {
    updatePayload.avatarUrl = avatarUrl.trim();
  }

  const profile = await Profile.findOneAndUpdate(
    { userId },
    { $set: updatePayload, $setOnInsert: { userId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return toProfileResponse(profile);
};

module.exports = {
  listProfiles,
  getProfileByUserId,
  upsertProfile,
};
