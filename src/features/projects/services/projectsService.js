const mongoose = require("mongoose");
const Project = require("../models/projectsModel");
const { createHttpError } = require("../../../common/http");

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toProjectResponse = (projectDocument) => ({
  id: projectDocument._id.toString(),
  ownerId: projectDocument.ownerId.toString(),
  title: projectDocument.title,
  description: projectDocument.description,
  status: projectDocument.status,
  techStack: projectDocument.techStack,
  tags: projectDocument.tags,
  repositoryUrl: projectDocument.repositoryUrl,
  liveUrl: projectDocument.liveUrl,
  createdAt: projectDocument.createdAt,
  updatedAt: projectDocument.updatedAt,
});

const createProject = async (payload = {}, currentUser) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  if (!payload.title || typeof payload.title !== "string") {
    throw createHttpError(400, "title is required");
  }

  const createdProject = await Project.create({
    ownerId: currentUser.id,
    title: payload.title.trim(),
    description: payload.description,
    status: payload.status,
    techStack: normalizeStringArray(payload.techStack),
    tags: normalizeStringArray(payload.tags),
    repositoryUrl: payload.repositoryUrl,
    liveUrl: payload.liveUrl,
  });

  return toProjectResponse(createdProject);
};

const listProjects = async ({ status, ownerId, tag, search, limit = 20, page = 1 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (ownerId) {
    assertObjectId(ownerId, "ownerId");
    filter.ownerId = ownerId;
  }

  if (tag) {
    filter.tags = String(tag).trim();
  }

  if (search) {
    const term = String(search).trim();
    filter.$or = [
      { title: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Project.countDocuments(filter),
  ]);

  return {
    items: items.map(toProjectResponse),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
    },
  };
};

const getProjectById = async (projectId) => {
  if (!projectId) {
    throw createHttpError(400, "projectId is required");
  }

  assertObjectId(projectId, "projectId");
  const project = await Project.findById(projectId);

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  return toProjectResponse(project);
};

const updateProject = async (projectId, updates = {}, currentUser) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  if (!projectId) {
    throw createHttpError(400, "projectId is required");
  }

  assertObjectId(projectId, "projectId");
  const project = await Project.findById(projectId);

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  if (project.ownerId.toString() !== currentUser.id && currentUser.role !== "admin") {
    throw createHttpError(403, "Only the project owner or an admin can update this project");
  }

  const allowedFields = [
    "title",
    "description",
    "status",
    "repositoryUrl",
    "liveUrl",
  ];

  const updatePayload = allowedFields.reduce((accumulator, key) => {
    if (updates[key] !== undefined) {
      accumulator[key] = updates[key];
    }
    return accumulator;
  }, {});

  const techStack = normalizeStringArray(updates.techStack);
  if (techStack !== undefined) {
    updatePayload.techStack = techStack;
  }

  const tags = normalizeStringArray(updates.tags);
  if (tags !== undefined) {
    updatePayload.tags = tags;
  }

  if (updatePayload.title && typeof updatePayload.title === "string") {
    updatePayload.title = updatePayload.title.trim();
  }

  if (Object.keys(updatePayload).length === 0) {
    throw createHttpError(400, "At least one updatable field is required");
  }

  const updatedProject = await Project.findByIdAndUpdate(projectId, updatePayload, {
    new: true,
    runValidators: true,
  });

  return toProjectResponse(updatedProject);
};

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
};
