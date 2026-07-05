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

const getUsers = async (_req, res) => {
  try {
    const users = await adminService.getAdminUsers();
    return sendSuccess(res, {
      message: "Admin users retrieved successfully",
      data: { users },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await adminService.updateAdminUser(
      req.params.userId,
      req.body,
    );
    return sendSuccess(res, {
      message: "Admin user updated successfully",
      data: { user },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getSubmissions = async (req, res) => {
  try {
    const submissions = await adminService.getSubmissions(req.query.status);
    return sendSuccess(res, {
      message: "Submissions retrieved successfully",
      data: { submissions },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const reviewSubmission = async (req, res) => {
  try {
    const submission = await adminService.reviewSubmission(
      req.params.submissionId,
      req.body,
    );
    return sendSuccess(res, {
      message: "Submission reviewed successfully",
      data: { submission },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const rateSubmission = async (req, res) => {
  try {
    const result = await adminService.rateSubmission(
      req.params.submissionId,
      req.user.id,
      req.body,
    );
    return sendSuccess(res, {
      message: "Submission rated successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getProjects = async (req, res) => {
  try {
    const projects = await adminService.getProjects(req.query.approvalStatus);
    return sendSuccess(res, {
      message: "Projects retrieved successfully",
      data: { projects },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateProjectApproval = async (req, res) => {
  try {
    const project = await adminService.updateProjectApproval(
      req.params.projectId,
      req.body.approvalStatus,
    );
    return sendSuccess(res, {
      message: "Project approval updated",
      data: { project },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getOverview,
  getUsers,
  updateUser,
  getSubmissions,
  reviewSubmission,
  rateSubmission,
  getProjects,
  updateProjectApproval
};
