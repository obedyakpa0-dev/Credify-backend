const submissionsService = require("../services/submissionsService");
const { sendSuccess, sendError } = require("../../../common/http");

const createSubmission = async (req, res) => {
  try {
    const submission = await submissionsService.createSubmission(req.body, req.user);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Submission created successfully",
      data: { submission },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const listSubmissions = async (req, res) => {
  try {
    const data = await submissionsService.listSubmissions(req.query, req.user);
    return sendSuccess(res, {
      message: "Submissions retrieved successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateSubmission = async (req, res) => {
  try {
    const submission = await submissionsService.updateSubmission(
      req.params.submissionId,
      req.body,
      req.user,
    );
    return sendSuccess(res, {
      message: "Submission updated successfully",
      data: { submission },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getSubmissionById = async (req, res) => {
  try {
    const submission = await submissionsService.getSubmissionById(
      req.params.submissionId,
      req.user
    );
    return sendSuccess(res, {
      message: "Submission retrieved successfully",
      data: { submission },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateSubmissionStatus = async (req, res) => {
  try {
    const submission = await submissionsService.updateSubmissionStatus(
      req.params.submissionId,
      req.body,
      req.user
    );
    return sendSuccess(res, {
      message: "Submission status updated successfully",
      data: { submission },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const rateSubmission = async (req, res) => {
  try {
    const result = await submissionsService.rateSubmission(
      req.params.submissionId,
      req.user,
      req.body
    );
    return sendSuccess(res, {
      message: "Submission rated successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createSubmission,
  listSubmissions,
  updateSubmission,
  getSubmissionById,
  updateSubmissionStatus,
  rateSubmission,
};
