const mongoose = require("mongoose");
const Submission = require("../models/submissionsModel");
const Project = require("../../projects/models/projectsModel");
const { createHttpError } = require("../../../common/http");

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const toSubmissionResponse = (submissionDocument) => ({
  id: submissionDocument._id.toString(),
  projectId: submissionDocument.projectId.toString(),
  userId: submissionDocument.userId.toString(),
  title: submissionDocument.title,
  content: submissionDocument.content,
  attachments: submissionDocument.attachments,
  status: submissionDocument.status,
  reviewerNotes: submissionDocument.reviewerNotes,
  createdAt: submissionDocument.createdAt,
  updatedAt: submissionDocument.updatedAt,
});

const createSubmission = async (
  { projectId, title, content, attachments } = {},
  currentUser
) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  if (!projectId || !title) {
    throw createHttpError(400, "projectId and title are required");
  }

  assertObjectId(projectId, "projectId");

  const project = await Project.findById(projectId);
  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  const createdSubmission = await Submission.create({
    projectId,
    userId: currentUser.id,
    title: String(title).trim(),
    content,
    attachments: Array.isArray(attachments)
      ? attachments
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  });

  return toSubmissionResponse(createdSubmission);
};

const listSubmissions = async (
  { projectId, userId, status, limit = 20, page = 1 } = {},
  currentUser
) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const filter = {};

  if (projectId) {
    assertObjectId(projectId, "projectId");
    filter.projectId = projectId;
  }

  if (status) {
    filter.status = status;
  }

  if (userId) {
    assertObjectId(userId, "userId");
    filter.userId = userId;
  }

  if (!["admin", "company"].includes(currentUser.role)) {
    filter.userId = currentUser.id;
  }

  const [items, total] = await Promise.all([
    Submission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Submission.countDocuments(filter),
  ]);

  return {
    items: items.map(toSubmissionResponse),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
    },
  };
};

const getSubmissionById = async (submissionId, currentUser) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  if (!submissionId) {
    throw createHttpError(400, "submissionId is required");
  }

  assertObjectId(submissionId, "submissionId");

  const submission = await Submission.findById(submissionId);
  if (!submission) {
    throw createHttpError(404, "Submission not found");
  }

  const isPrivilegedRole = ["admin", "company"].includes(currentUser.role);
  if (!isPrivilegedRole && submission.userId.toString() !== currentUser.id) {
    throw createHttpError(403, "You are not allowed to access this submission");
  }

  return toSubmissionResponse(submission);
};

const updateSubmissionStatus = async (
  submissionId,
  { status, reviewerNotes } = {},
  currentUser
) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  if (!["admin", "company"].includes(currentUser.role)) {
    throw createHttpError(
      403,
      "Only admin/company accounts can review and update submission status"
    );
  }

  if (!submissionId || !status) {
    throw createHttpError(400, "submissionId and status are required");
  }

  assertObjectId(submissionId, "submissionId");

  const allowedStatus = ["pending", "reviewing", "approved", "rejected"];
  if (!allowedStatus.includes(status)) {
    throw createHttpError(400, `status must be one of: ${allowedStatus.join(", ")}`);
  }

  const updatedSubmission = await Submission.findByIdAndUpdate(
    submissionId,
    {
      status,
      reviewerNotes: typeof reviewerNotes === "string" ? reviewerNotes.trim() : "",
    },
    { new: true, runValidators: true }
  );

  if (!updatedSubmission) {
    throw createHttpError(404, "Submission not found");
  }

  return toSubmissionResponse(updatedSubmission);
};

module.exports = {
  createSubmission,
  listSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
};
