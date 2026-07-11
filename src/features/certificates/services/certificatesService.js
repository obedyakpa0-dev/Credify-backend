const mongoose = require("mongoose");
const Certificate = require("../models/certificatesModel");
const { createHttpError } = require("../../../common/http");

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const createCertificateNumber = () =>
  `CERT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const toCertificateResponse = (certificateDocument) => {
  const res = {
    id: certificateDocument._id.toString(),
    userId: certificateDocument.userId?.toString() || certificateDocument.userId,
    projectId: certificateDocument.projectId?._id?.toString() || certificateDocument.projectId?.toString() || certificateDocument.projectId,
    certificateNumber: certificateDocument.certificateNumber,
    issuedAt: certificateDocument.issuedAt,
    metadata: certificateDocument.metadata,
    createdAt: certificateDocument.createdAt,
    updatedAt: certificateDocument.updatedAt,
  };
  if (certificateDocument.projectId && typeof certificateDocument.projectId === "object") {
    res.projectId = {
      id: certificateDocument.projectId._id?.toString(),
      title: certificateDocument.projectId.title,
      description: certificateDocument.projectId.description,
      status: certificateDocument.projectId.status,
      techStack: certificateDocument.projectId.techStack,
      tags: certificateDocument.projectId.tags,
    };
  }
  if (certificateDocument.userId && typeof certificateDocument.userId === "object") {
    res.userId = {
      id: certificateDocument.userId._id?.toString(),
      name: certificateDocument.userId.name,
      email: certificateDocument.userId.email,
    };
  }
  return res;
};

const createCertificate = async ({ userId, projectId, certificateNumber, metadata } = {}) => {
  if (!userId || !projectId) {
    throw createHttpError(400, "userId and projectId are required");
  }

  assertObjectId(userId, "userId");
  assertObjectId(projectId, "projectId");

  const generatedNumber = certificateNumber || createCertificateNumber();

  const createdCertificate = await Certificate.create({
    userId,
    projectId,
    certificateNumber: String(generatedNumber).trim(),
    metadata: metadata || {},
  });

  return toCertificateResponse(createdCertificate);
};

const listCertificates = async ({ userId, limit = 20, page = 1 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  const filter = {};

  if (userId) {
    assertObjectId(userId, "userId");
    filter.userId = userId;
  }

  const [certificates, total] = await Promise.all([
    Certificate.find(filter)
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("projectId")
      .populate("userId"),
    Certificate.countDocuments(filter),
  ]);

  return {
    items: certificates.map(toCertificateResponse),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
    },
  };
};

const getCertificateById = async (certificateId) => {
  if (!certificateId) {
    throw createHttpError(400, "certificateId is required");
  }

  assertObjectId(certificateId, "certificateId");

  const certificate = await Certificate.findById(certificateId)
    .populate("projectId")
    .populate("userId");
  if (!certificate) {
    throw createHttpError(404, "Certificate not found");
  }

  return toCertificateResponse(certificate);
};

module.exports = {
  createCertificate,
  listCertificates,
  getCertificateById,
};
