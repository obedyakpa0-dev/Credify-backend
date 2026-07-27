const mongoose = require("mongoose");
const Submission = require("../models/submissionsModel");
const Project = require("../../projects/models/projectsModel");
const { createHttpError } = require("../../../common/http");
const Rating = require("../../ratings/models/ratingsModel");

const RATING_POINTS = { green: 3, yellow: 2, red: 1 };

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const toSubmissionResponse = async (submissionDocument) => {
  const isPopulated = submissionDocument.projectId && typeof submissionDocument.projectId === "object";
  const projectIdStr = isPopulated ? submissionDocument.projectId._id.toString() : submissionDocument.projectId.toString();

  const isUserPopulated = submissionDocument.userId && typeof submissionDocument.userId === "object";
  const userIdStr = isUserPopulated ? submissionDocument.userId._id.toString() : submissionDocument.userId.toString();
  
  const ratingDoc = await Rating.findOne({ submissionId: submissionDocument._id });

  const res = {
    id: submissionDocument._id.toString(),
    _id: submissionDocument._id.toString(),
    projectId: projectIdStr,
    userId: userIdStr,
    student: isUserPopulated ? {
      id: userIdStr,
      name: submissionDocument.userId.name,
      email: submissionDocument.userId.email,
      university: submissionDocument.userId.university || "",
      programme: submissionDocument.userId.programme || "",
      avatar: submissionDocument.userId.avatar || "",
    } : null,
    userName: isUserPopulated ? submissionDocument.userId.name : "Student",
    title: submissionDocument.title,
    content: submissionDocument.content,
    attachments: submissionDocument.attachments || [],
    githubRepoUrl: submissionDocument.githubRepoUrl || "",
    zipFileUrl: submissionDocument.zipFileUrl || "",
    zipFileName: submissionDocument.zipFileName || "",
    submissionType: submissionDocument.submissionType || "github",
    status: submissionDocument.status,
    reviewerNotes: submissionDocument.reviewerNotes || "",
    createdAt: submissionDocument.createdAt,
    updatedAt: submissionDocument.updatedAt,
    rating: ratingDoc ? ratingDoc.rating : null,
    feedback: ratingDoc ? (ratingDoc.comment || submissionDocument.reviewerNotes) : (submissionDocument.reviewerNotes || null),
  };

  if (isPopulated) {
    res.project = {
      id: projectIdStr,
      title: submissionDocument.projectId.title,
      description: submissionDocument.projectId.description,
      skill: submissionDocument.projectId.skill,
      instructions: submissionDocument.projectId.instructions,
      duration: submissionDocument.projectId.duration,
      type: submissionDocument.projectId.type,
      status: submissionDocument.projectId.status,
      techStack: submissionDocument.projectId.techStack,
      tags: submissionDocument.projectId.tags,
      repositoryUrl: submissionDocument.projectId.repositoryUrl,
      liveUrl: submissionDocument.projectId.liveUrl,
    };
  }

  return res;
};

const determineSubmissionType = (githubRepoUrl, zipFileUrl, explicitType) => {
  if (explicitType && ["github", "zip", "both", "other"].includes(explicitType)) {
    return explicitType;
  }
  if (githubRepoUrl && zipFileUrl) return "both";
  if (zipFileUrl) return "zip";
  return "github";
};

const createSubmission = async (
  { projectId, title, content, attachments, githubRepoUrl, zipFileUrl, zipFileName, submissionType } = {},
  currentUser
) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  if (!projectId || !title) {
    throw createHttpError(400, "projectId and title are required");
  }

  if (typeof title === "string" && title.trim().length < 3) {
    throw createHttpError(400, "title must be at least 3 characters");
  }

  assertObjectId(projectId, "projectId");

  const project = await Project.findById(projectId);
  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  // Only allow submissions to approved projects
  if (project.approvalStatus !== "approved") {
    throw createHttpError(400, "Submissions are only accepted for approved projects");
  }

  // Prevent duplicate submissions (one per user per project)
  const existingSubmission = await Submission.findOne({
    projectId,
    userId: currentUser.id,
  });
  if (existingSubmission) {
    throw createHttpError(409, "You have already submitted work for this project");
  }

  const cleanGithub = typeof githubRepoUrl === "string" ? githubRepoUrl.trim() : "";
  const cleanZipUrl = typeof zipFileUrl === "string" ? zipFileUrl.trim() : "";
  const cleanZipName = typeof zipFileName === "string" ? zipFileName.trim() : "";
  const finalType = determineSubmissionType(cleanGithub, cleanZipUrl, submissionType);

  const createdSubmission = await Submission.create({
    projectId,
    userId: currentUser.id,
    title: String(title).trim(),
    content: typeof content === "string" ? content.trim() : "",
    attachments: Array.isArray(attachments)
      ? attachments
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 10)
      : [],
    githubRepoUrl: cleanGithub,
    zipFileUrl: cleanZipUrl,
    zipFileName: cleanZipName,
    submissionType: finalType,
  });

  return await toSubmissionResponse(createdSubmission);
};

const listSubmissions = async (
  { projectId, userId, status, limit = 50, page = 1 } = {},
  currentUser
) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
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

  // If user is a company, filter to submissions for projects owned by this company
  if (currentUser.role === "company") {
    const companyProjects = await Project.find({ ownerId: currentUser.id }).select("_id");
    const companyProjectIds = companyProjects.map((p) => p._id);
    filter.projectId = { $in: companyProjectIds };
  } else if (currentUser.role !== "admin") {
    filter.userId = currentUser.id;
  }

  const [items, total] = await Promise.all([
    Submission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("projectId")
      .populate("userId", "name email university programme avatar"),
    Submission.countDocuments(filter),
  ]);

  const itemsResponse = await Promise.all(items.map(toSubmissionResponse));

  return {
    items: itemsResponse,
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

  const submission = await Submission.findById(submissionId)
    .populate("projectId")
    .populate("userId", "name email university programme avatar");

  if (!submission) {
    throw createHttpError(404, "Submission not found");
  }

  const isPrivilegedRole = ["admin", "company"].includes(currentUser.role);
  if (!isPrivilegedRole && submission.userId._id.toString() !== currentUser.id) {
    throw createHttpError(403, "You are not allowed to access this submission");
  }

  return await toSubmissionResponse(submission);
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
      "Only company and admin accounts can review and update submission status"
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
  ).populate("projectId").populate("userId", "name email university programme avatar");

  if (!updatedSubmission) {
    throw createHttpError(404, "Submission not found");
  }

  return await toSubmissionResponse(updatedSubmission);
};

const updateSubmission = async (
  submissionId,
  { title, content, attachments, githubRepoUrl, zipFileUrl, zipFileName, submissionType } = {},
  currentUser
) => {
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

  // Only the owner can update their own submission content
  if (submission.userId.toString() !== currentUser.id) {
    throw createHttpError(403, "You are not allowed to update this submission");
  }

  // Prevent edits once it's been reviewed
  if (!["pending"].includes(submission.status)) {
    throw createHttpError(
      400,
      "This submission can no longer be edited because it has already been reviewed"
    );
  }

  const updates = {};

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length < 3) {
      throw createHttpError(400, "title must be at least 3 characters");
    }
    updates.title = title.trim();
  }

  if (content !== undefined) {
    updates.content = typeof content === "string" ? content.trim() : "";
  }

  if (attachments !== undefined) {
    updates.attachments = Array.isArray(attachments)
      ? attachments
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];
  }

  if (githubRepoUrl !== undefined) {
    updates.githubRepoUrl = typeof githubRepoUrl === "string" ? githubRepoUrl.trim() : "";
  }

  if (zipFileUrl !== undefined) {
    updates.zipFileUrl = typeof zipFileUrl === "string" ? zipFileUrl.trim() : "";
  }

  if (zipFileName !== undefined) {
    updates.zipFileName = typeof zipFileName === "string" ? zipFileName.trim() : "";
  }

  const newGithub = updates.githubRepoUrl !== undefined ? updates.githubRepoUrl : submission.githubRepoUrl;
  const newZip = updates.zipFileUrl !== undefined ? updates.zipFileUrl : submission.zipFileUrl;
  updates.submissionType = determineSubmissionType(newGithub, newZip, submissionType);

  if (Object.keys(updates).length === 0) {
    throw createHttpError(400, "No valid fields provided to update");
  }

  const updatedSubmission = await Submission.findByIdAndUpdate(
    submissionId,
    updates,
    { new: true, runValidators: true }
  ).populate("projectId").populate("userId", "name email university programme avatar");

  return await toSubmissionResponse(updatedSubmission);
};

const rateSubmission = async (submissionId, currentUser, { rating, comment }) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  if (!["company", "admin"].includes(currentUser.role)) {
    throw createHttpError(403, "Only company accounts (or admin) can rate submissions");
  }

  if (!RATING_POINTS[rating]) {
    throw createHttpError(400, "rating must be one of: green, yellow, red");
  }

  assertObjectId(submissionId, "submissionId");

  const submission = await Submission.findById(submissionId).populate("projectId");
  if (!submission) {
    throw createHttpError(404, "Submission not found");
  }

  // If user is company, ensure the submission belongs to a project owned by this company
  if (currentUser.role === "company") {
    const projectOwnerId = submission.projectId?.ownerId?.toString() || submission.projectId?.toString();
    if (projectOwnerId !== currentUser.id) {
      throw createHttpError(403, "You can only rate submissions for your own company projects");
    }
  }

  const raterId = currentUser.id;
  const savedRating = await Rating.findOneAndUpdate(
    { submissionId, raterId },
    {
      $set: {
        projectId: submission.projectId._id || submission.projectId,
        submissionId: submission._id,
        raterId,
        rating,
        points: RATING_POINTS[rating],
        comment: typeof comment === "string" ? comment.trim() : "",
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  submission.status = "approved";
  if (comment) {
    submission.reviewerNotes = comment.trim();
  }
  await submission.save();

  const updatedSub = await Submission.findById(submissionId)
    .populate("projectId")
    .populate("userId", "name email university programme avatar");

  const responseSub = await toSubmissionResponse(updatedSub);

  return { submission: responseSub, rating: savedRating };
};

module.exports = {
  createSubmission,
  listSubmissions,
  updateSubmission,
  getSubmissionById,
  updateSubmissionStatus,
  rateSubmission,
};
