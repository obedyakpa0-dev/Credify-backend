const adminService = require("../services/adminService");
const { sendSuccess, sendError } = require("../../../common/http");

const getOverview = async (_req, res) => {
  try {
    const overview = await adminService.getAdminOverview();
    return sendSuccess(res, {
      message: "Admin overview retrieved successfully",
      data: { overview },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getOverview,
};
