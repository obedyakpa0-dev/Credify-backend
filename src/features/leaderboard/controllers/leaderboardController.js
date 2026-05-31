const leaderboardService = require("../services/leaderboardService");
const { sendSuccess, sendError } = require("../../../common/http");

const upsertEntry = async (req, res) => {
  try {
    const entry = await leaderboardService.upsertEntry(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Leaderboard entry saved successfully",
      data: { entry },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getTopEntries = async (req, res) => {
  try {
    const items = await leaderboardService.getTopEntries(req.query);
    return sendSuccess(res, {
      message: "Top leaderboard entries retrieved successfully",
      data: { items },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getEntryByUserId = async (req, res) => {
  try {
    const entry = await leaderboardService.getEntryByUserId(req.params.userId);
    return sendSuccess(res, {
      message: "Leaderboard entry retrieved successfully",
      data: { entry },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  upsertEntry,
  getTopEntries,
  getEntryByUserId,
};
