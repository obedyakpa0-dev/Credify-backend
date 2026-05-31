const ratingsService = require("../services/ratingsService");
const { sendSuccess, sendError } = require("../../../common/http");

const upsertRating = async (req, res) => {
  try {
    const rating = await ratingsService.upsertRating(req.body, req.user);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Rating submitted successfully",
      data: { rating },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const listProjectRatings = async (req, res) => {
  try {
    const data = await ratingsService.listProjectRatings(
      req.params.projectId,
      req.query
    );
    return sendSuccess(res, {
      message: "Ratings retrieved successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getProjectRatingSummary = async (req, res) => {
  try {
    const summary = await ratingsService.getProjectRatingSummary(req.params.projectId);
    return sendSuccess(res, {
      message: "Rating summary retrieved successfully",
      data: { summary },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  upsertRating,
  listProjectRatings,
  getProjectRatingSummary,
};
