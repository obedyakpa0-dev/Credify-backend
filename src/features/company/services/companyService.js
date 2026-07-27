const AuthenticationUser = require("../../authentication/models/authenticationModel");
const paymentConfig = require("../../../../config/payment");
const { createHttpError } = require("../../../common/http");

const ALLOWED_COMPANY_FIELDS = [
  "name",
  "companyName",
  "industry",
  "description",
  "phone",
  "location",
  "website",
  "supportEmail",
];

const toCompanyProfileResponse = (user) => ({
  id: user._id.toString(),
  name: user.name,
  companyName: user.companyName || "",
  email: user.email,
  industry: user.industry || "",
  description: user.description || "",
  phone: user.phone || "",
  location: user.location || "",
  website: user.website || "",
  supportEmail: user.supportEmail || user.email,
  paymentProvider: paymentConfig.provider,
  paymentCurrency: paymentConfig.currency,
});

/**
 * Get the company profile for the authenticated company user.
 */
const getCompanyProfile = async (userId) => {
  if (!userId) {
    throw createHttpError(401, "Authentication required");
  }

  const user = await AuthenticationUser.findById(userId);
  if (!user) {
    throw createHttpError(404, "Company user not found");
  }

  return toCompanyProfileResponse(user);
};

/**
 * Update the company profile. Only updates allowed fields; always scoped to the
 * authenticated user — the userId from the JWT cannot be overridden via the body.
 */
const updateCompanyProfile = async (userId, updates = {}) => {
  if (!userId) {
    throw createHttpError(401, "Authentication required");
  }

  const updatePayload = ALLOWED_COMPANY_FIELDS.reduce((acc, key) => {
    if (updates[key] !== undefined) {
      acc[key] = typeof updates[key] === "string" ? updates[key].trim() : updates[key];
    }
    return acc;
  }, {});

  if (Object.keys(updatePayload).length === 0) {
    throw createHttpError(400, "At least one updatable field is required");
  }

  const updatedUser = await AuthenticationUser.findByIdAndUpdate(
    userId,
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw createHttpError(404, "Company user not found");
  }

  return toCompanyProfileResponse(updatedUser);
};

module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
};
