const badgesService = require("../services/badgesService");
const { sendSuccess, sendError } = require("../../../common/http");

const createBadge = async (req, res) => {
  try {
    const badge = await badgesService.createBadge(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Badge created successfully",
      data: { badge },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const listBadges = async (req, res) => {
  try {
    const data = await badgesService.listBadges(req.query);
    return sendSuccess(res, {
      message: "Badges retrieved successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getBadgeById = async (req, res) => {
  try {
    const badge = await badgesService.getBadgeById(req.params.badgeId);
    return sendSuccess(res, {
      message: "Badge retrieved successfully",
      data: { badge },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateBadge = async (req, res) => {
  try {
    const badge = await badgesService.updateBadge(req.params.badgeId, req.body);
    return sendSuccess(res, {
      message: "Badge updated successfully",
      data: { badge },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createBadge,
  listBadges,
  getBadgeById,
  updateBadge,
};
