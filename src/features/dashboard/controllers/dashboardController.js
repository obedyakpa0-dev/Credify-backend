const dashboardService = require("../services/dashboardService");
const { sendSuccess, sendError } = require("../../../common/http");

const getSummary = async (_req, res) => {
  try {
    const summary = await dashboardService.getDashboardSummary();
    return sendSuccess(res, {
      message: "Dashboard summary retrieved successfully",
      data: { summary },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getSummary,
};
