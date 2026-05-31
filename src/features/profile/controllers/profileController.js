const profileService = require("../services/profileService");
const { sendSuccess, sendError } = require("../../../common/http");

const listProfiles = async (req, res) => {
  try {
    const data = await profileService.listProfiles(req.query);
    return sendSuccess(res, {
      message: "Profiles retrieved successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getProfileByUserId = async (req, res) => {
  try {
    const profile = await profileService.getProfileByUserId(req.params.userId);
    return sendSuccess(res, {
      message: "Profile retrieved successfully",
      data: { profile },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const upsertProfile = async (req, res) => {
  try {
    const profile = await profileService.upsertProfile(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Profile saved successfully",
      data: { profile },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  listProfiles,
  getProfileByUserId,
  upsertProfile,
};
