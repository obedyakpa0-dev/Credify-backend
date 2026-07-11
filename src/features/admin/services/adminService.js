const AuthenticationUser = require("../../authentication/models/authenticationModel");
const Payment = require("../../payments/models/paymentsModel");
const Certificate = require("../../certificates/models/certificatesModel");
const Project = require("../../projects/models/projectsModel");
const { createHttpError } = require("../../../common/http");
const Submission = require("../../submissions/models/submissionsModel");
const Rating = require("../../ratings/models/ratingsModel");

const POINTS_BY_COLOR = { green: 3, yellow: 2, red: 1 };

const rateSubmission = async (submissionId, raterId, { rating, comment }) => {
  if (!POINTS_BY_COLOR[rating]) {
    throw createHttpError(400, "rating must be one of: green, yellow, red");
  }

  const submission = await Submission.findById(submissionId);
  if (!submission) {
    throw createHttpError(404, "Submission not found");
  }

  // Upsert: if this admin already rated this project, update it instead of erroring on the unique index
  const savedRating = await Rating.findOneAndUpdate(
    { projectId: submission.projectId, raterId },
    {
      $set: { rating, points: POINTS_BY_COLOR[rating], comment: comment || "" },
    },
    { new: true, upsert: true, runValidators: true },
  );

  submission.status = "reviewing";
  await submission.save();

  return { submission, rating: savedRating };
};
const getSubmissions = async (status) => {
  const filter = status ? { status } : {};
  return Submission.find(filter)
    .sort({ createdAt: -1 })
    .populate("projectId", "title")
    .populate("userId", "name email");
};

const reviewSubmission = async (submissionId, { status, reviewerNotes }) => {
  const allowedStatuses = ["reviewing", "approved", "rejected"];
  if (!allowedStatuses.includes(status)) {
    throw createHttpError(
      400,
      `status must be one of: ${allowedStatuses.join(", ")}`,
    );
  }

  const updatePayload = { status };
  if (reviewerNotes !== undefined) {
    updatePayload.reviewerNotes = reviewerNotes;
  }

  const submission = await Submission.findByIdAndUpdate(
    submissionId,
    { $set: updatePayload },
    { new: true, runValidators: true },
  );

  if (!submission) {
    throw createHttpError(404, "Submission not found");
  }

  return submission;
};

const getAdminOverview = async () => {
  const [
    totalUsers,
    totalPayments,
    paidPayments,
    totalCertificates,
    recentUsers,
    recentPayments,
  ] = await Promise.all([
    AuthenticationUser.countDocuments(),
    Payment.countDocuments(),
    Payment.countDocuments({ status: "paid" }),
    Certificate.countDocuments(),
    AuthenticationUser.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role"),
    Payment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("amount currency status reference"),
  ]);

  return {
    totals: {
      users: totalUsers,
      payments: totalPayments,
      totalpaidPayments: paidPayments,
      certificates: totalCertificates,
    },
    recentUsers,
    recentPayments,
  };
};

const getAdminUsers = async () => {
  const users = await AuthenticationUser.find()
    .sort({ createdAt: -1 })
    .select("name email role university companyName emailVerified createdAt");

  return users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    university: user.university,
    companyName: user.companyName,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  }));
};

const updateAdminUser = async (userId, updates = {}) => {
  if (!userId) {
    throw createHttpError(400, "userId is required");
  }

  const allowedFields = [
    "emailVerified",
    "role",
    "companyName",
    "name",
    "university",
    "programme",
  ];
  const updatePayload = {};

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      updatePayload[field] = updates[field];
    }
  });

  if (Object.keys(updatePayload).length === 0) {
    throw createHttpError(400, "At least one updatable field is required");
  }

  const updatedUser = await AuthenticationUser.findByIdAndUpdate(
    userId,
    { $set: updatePayload },
    { new: true, runValidators: true },
  );

  if (!updatedUser) {
    throw createHttpError(404, "User not found");
  }

  return {
    id: updatedUser._id.toString(),
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    university: updatedUser.university,
    companyName: updatedUser.companyName,
    emailVerified: updatedUser.emailVerified,
    createdAt: updatedUser.createdAt,
  };
};

const getAllProjectsAdmin = async () => {
  return Project.find().sort({ createdAt: -1 });
};

const deleteProjectAdmin = async (projectId) => {
  const deleted = await Project.findByIdAndDelete(projectId);
  if (!deleted) throw createHttpError(404, "Project not found");
  return deleted;
};

const toAdminProjectResponse = (p) => ({
  id: p._id.toString(),
  _id: p._id.toString(),
  ownerId: p.ownerId?._id?.toString() || p.ownerId?.toString(),
  company: p.ownerId?.companyName || p.ownerId?.name || "—",
  title: p.title,
  description: p.description,
  skill: p.skill,
  instructions: p.instructions,
  duration: p.duration,
  type: p.type,
  status: p.status,
  approvalStatus: p.approvalStatus,
  techStack: p.techStack,
  tags: p.tags,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

const getProjects = async (approvalStatus) => {
  const filter = approvalStatus ? { approvalStatus } : {};
  const projects = await Project.find(filter)
    .sort({ createdAt: -1 })
    .populate("ownerId", "companyName name email");
  return projects.map(toAdminProjectResponse);
};

const updateProjectApproval = async (projectId, approvalStatus) => {
  const allowed = ["approved", "rejected"];
  if (!allowed.includes(approvalStatus)) {
    throw createHttpError(
      400,
      `approvalStatus must be one of: ${allowed.join(", ")}`,
    );
  }

  const project = await Project.findByIdAndUpdate(
    projectId,
    { $set: { approvalStatus } },
    { new: true, runValidators: true },
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  return project;
};

const getCertificates = async () => {
  return Certificate.find()
    .sort({ createdAt: -1 })
    .populate("userId", "name email")
    .populate("projectId", "title");
};

const getRatings = async () => {
  const ratings = await Rating.find()
    .sort({ createdAt: -1 })
    .populate("projectId", "title")
    .populate("raterId", "name email");

  const populatedRatings = await Promise.all(
    ratings.map(async (r) => {
      const submission = await Submission.findOne({ projectId: r.projectId })
        .populate("userId", "name email");
      return {
        _id: r._id,
        rating: r.rating,
        points: r.points,
        comment: r.comment,
        createdAt: r.createdAt,
        project: r.projectId?.title || "—",
        student: submission?.userId?.name || "—",
        userId: submission?.userId,
        submissionId: submission,
      };
    })
  );
  return populatedRatings;
};

const deleteRating = async (ratingId) => {
  const deleted = await Rating.findByIdAndDelete(ratingId);
  if (!deleted) throw createHttpError(404, "Rating not found");
  return deleted;
};

module.exports = {
  getAdminOverview,
  getAdminUsers,
  updateAdminUser,
  getAllProjectsAdmin,
  deleteProjectAdmin,
  getSubmissions,
  reviewSubmission,
  getCertificates,
  getProjects,
  updateProjectApproval,
  rateSubmission,
  getRatings,
  deleteRating,
};
