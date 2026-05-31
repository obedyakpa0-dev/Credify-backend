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

const toCertificateResponse = (certificateDocument) => ({
  id: certificateDocument._id.toString(),
  userId: certificateDocument.userId.toString(),
  courseId: certificateDocument.courseId.toString(),
  certificateNumber: certificateDocument.certificateNumber,
  issuedAt: certificateDocument.issuedAt,
  metadata: certificateDocument.metadata,
  createdAt: certificateDocument.createdAt,
  updatedAt: certificateDocument.updatedAt,
});

const createCertificate = async ({ userId, courseId, certificateNumber, metadata } = {}) => {
  if (!userId || !courseId) {
    throw createHttpError(400, "userId and courseId are required");
  }

  assertObjectId(userId, "userId");
  assertObjectId(courseId, "courseId");

  const generatedNumber = certificateNumber || createCertificateNumber();

  const createdCertificate = await Certificate.create({
    userId,
    courseId,
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
    Certificate.find(filter).sort({ issuedAt: -1 }).skip(skip).limit(safeLimit),
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

  const certificate = await Certificate.findById(certificateId);
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
