const companyService = require("../services/companyService");
const { sendSuccess, sendError } = require("../../../common/http");

const getCompanyProfile = async (req, res) => {
  try {
    const profile = await companyService.getCompanyProfile(req.user.id);
    return sendSuccess(res, {
      message: "Company profile retrieved successfully",
      data: { profile },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateCompanyProfile = async (req, res) => {
  try {
    const profile = await companyService.updateCompanyProfile(req.user.id, req.body);
    return sendSuccess(res, {
      message: "Company profile updated successfully",
      data: { profile },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
};
