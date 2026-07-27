const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const environment = require("../../../../config/environment");
const AuthenticationUser = require("../models/authenticationModel");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ROLE_REDIRECT_MAP = {
  student: "/dashboard",
  graduate: "/dashboard",
  company: "/company/dashboard",
  admin: "/admin/dashboard",
};

const VALID_REGISTRATION_ROLES = ["student", "graduate", "company", "admin"];

const sanitizeUser = (userDocument) => ({
  id: userDocument._id.toString(),
  name: userDocument.name,
  email: userDocument.email,
  university: userDocument.university || "",
  programme: userDocument.programme || "",
  companyName: userDocument.companyName || "",
  phone: userDocument.phone || "",
  location: userDocument.location || "",
  industry: userDocument.industry || "",
  description: userDocument.description || "",
  emailVerified: userDocument.emailVerified || false,
  role: userDocument.role,
  createdAt: userDocument.createdAt,
  updatedAt: userDocument.updatedAt,
});

const createAccessToken = (userDocument) =>
  jwt.sign(
    {
      sub: userDocument._id.toString(),
      email: userDocument.email,
      role: userDocument.role,
    },
    environment.jwtSecret,
    { expiresIn: environment.jwtExpiresIn },
  );

const createRandomToken = () => crypto.randomBytes(32).toString("hex");

const createEmailTransport = () => {
  return nodemailer.createTransport({
    host: environment.smtpHost,
    port: environment.smtpPort,
    secure: environment.smtpSecure,
    auth: {
      user: environment.smtpUser,
      pass: environment.smtpPass,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!environment.smtpHost || !environment.smtpUser || !environment.smtpPass) {
    console.warn("SMTP is not fully configured; skipping email delivery.");
    return;
  }

  const transporter = createEmailTransport();
  await transporter.sendMail({
    from: environment.emailFrom,
    to,
    subject,
    text,
    html,
  });
};

const getVerificationUrl = (token) =>
  `${environment.frontendUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;

const getResetUrl = (token) =>
  `${environment.frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = getVerificationUrl(token);
  const subject = "Verify your Credify email";
  const text = `Hi ${user.name},\n\nPlease verify your Credify email by clicking the link below:\n${verifyUrl}\n\nIf you did not create this account, ignore this message.`;
  const html = `<p>Hi ${user.name},</p><p>Please verify your Credify email by clicking the link below:</p><p><a href="${verifyUrl}">Verify my email</a></p><p>If you did not create this account, ignore this message.</p>`;
  await sendEmail({ to: user.email, subject, text, html });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = getResetUrl(token);
  const subject = "Reset your Credify password";
  const text = `Hi ${user.name},\n\nUse the link below to reset your Credify password:\n${resetUrl}\n\nIf you did not request a password reset, ignore this message.`;
  const html = `<p>Hi ${user.name},</p><p>Use the link below to reset your Credify password:</p><p><a href="${resetUrl}">Reset my password</a></p><p>If you did not request a password reset, ignore this message.</p>`;
  await sendEmail({ to: user.email, subject, text, html });
};

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    throw createHttpError(401, "Authorization header is required");
  }

  const [scheme, token] = authorizationHeader.trim().split(" ");

  if (scheme !== "Bearer" || !token) {
    throw createHttpError(401, "Authorization header must be a Bearer token");
  }

  return token;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const registerUser = async ({
  name,
  email,
  password,
  university,
  programme,
  companyName,
  role,
} = {}) => {
  if (!name || !email || !password || !role) {
    throw createHttpError(400, "name, email, password and role are required");
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    throw createHttpError(400, "Invalid email address format");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createHttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (typeof name !== "string" || name.trim().length < 2) {
    throw createHttpError(400, "Name must be at least 2 characters");
  }

  // Prevent self-registration as admin
  if (!VALID_REGISTRATION_ROLES.includes(role)) {
    throw createHttpError(
      400,
      `Invalid role. Allowed roles: ${VALID_REGISTRATION_ROLES.join(", ")}`,
    );
  }

  // Validate fields based on role
  if ((role === "student" || role === "graduate") && !university) {
    throw createHttpError(
      400,
      "University is required for students and graduates",
    );
  }

  if (role === "company" && !companyName) {
    throw createHttpError(400, "Company name is required for company accounts");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await AuthenticationUser.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw createHttpError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(
    password,
    environment.bcryptSaltRounds,
  );
  const verificationToken = createRandomToken();
  const verificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const createdUser = await AuthenticationUser.create({
    name: name.trim(),
    email: normalizedEmail,
    password: passwordHash,
    university: university ? university.trim() : "",
    programme: programme ? programme.trim() : "",
    companyName: companyName ? companyName.trim() : "",
    role,
    verificationToken,
    verificationTokenExpiry,
  });

  await sendVerificationEmail(createdUser, verificationToken);

  const accessToken = createAccessToken(createdUser);

  return {
    accessToken,
    user: sanitizeUser(createdUser),
    redirectPath: ROLE_REDIRECT_MAP[createdUser.role] || "/dashboard",
  };
};

const loginUser = async ({ email, password } = {}) => {
  if (!email || !password) {
    throw createHttpError(400, "email and password are required");
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    throw createHttpError(400, "Invalid email address format");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const foundUser = await AuthenticationUser.findOne({
    email: normalizedEmail,
  }).select("+password");

  // Generic error avoids user enumeration
  if (!foundUser) {
    throw createHttpError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, foundUser.password);

  if (!isPasswordValid) {
    throw createHttpError(401, "Invalid email or password");
  }

  // Block suspended accounts
  if (foundUser.isSuspended) {
    throw createHttpError(403, "Your account has been suspended. Please contact support.");
  }

  const accessToken = createAccessToken(foundUser);

  return {
    accessToken,
    user: sanitizeUser(foundUser),
    redirectPath: ROLE_REDIRECT_MAP[foundUser.role] || "/dashboard",
  };
};

const getAuthenticatedUser = async (authorizationHeader) => {
  const token = extractBearerToken(authorizationHeader);

  let payload;
  try {
    payload = jwt.verify(token, environment.jwtSecret, {
      algorithms: ["HS256"],
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw createHttpError(401, "Your session has expired. Please sign in again.");
    }
    throw createHttpError(401, "Invalid token. Please sign in again.");
  }

  if (!payload.sub || !payload.email || !payload.role) {
    throw createHttpError(401, "Malformed token payload");
  }

  const user = await AuthenticationUser.findById(payload.sub);

  if (!user) {
    throw createHttpError(401, "Account not found");
  }

  // Block all API access for suspended users even if JWT is still valid
  if (user.isSuspended) {
    throw createHttpError(403, "Your account has been suspended. Please contact support.");
  }

  return sanitizeUser(user);
};

const requestPasswordReset = async ({ email } = {}) => {
  if (!email) {
    throw createHttpError(400, "email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await AuthenticationUser.findOne({ email: normalizedEmail });

  if (!user) {
    return;
  }

  const resetToken = createRandomToken();
  const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60);

  user.resetToken = resetToken;
  user.resetTokenExpiry = resetTokenExpiry;
  await user.save();

  await sendPasswordResetEmail(user, resetToken);
};

const resetPassword = async ({ token, password } = {}) => {
  if (!token || !password) {
    throw createHttpError(400, "token and password are required");
  }

  const user = await AuthenticationUser.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  }).select("+password");

  if (!user) {
    throw createHttpError(400, "Invalid or expired reset token");
  }

  user.password = await bcrypt.hash(password, environment.bcryptSaltRounds);
  user.resetToken = "";
  user.resetTokenExpiry = null;
  await user.save();
};

const verifyEmail = async ({ token } = {}) => {
  if (!token) {
    throw createHttpError(400, "token is required");
  }

  const user = await AuthenticationUser.findOne({
    verificationToken: token,
    verificationTokenExpiry: { $gt: new Date() },
  });

  if (!user) {
    throw createHttpError(400, "Invalid or expired verification token");
  }

  user.emailVerified = true;
  user.verificationToken = "";
  user.verificationTokenExpiry = null;
  await user.save();
};

const updateUserProfile = async (userId, updates = {}) => {
  if (!userId) {
    throw createHttpError(400, "userId is required");
  }

  const user = await AuthenticationUser.findById(userId);
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  const allowedFields = [
    "name",
    "email",
    "university",
    "programme",
    "companyName",
    "phone",
    "location",
    "industry",
    "description",
  ];

  const updatePayload = {};

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      if (typeof updates[field] === "string") {
        updatePayload[field] = updates[field].trim();
      } else {
        updatePayload[field] = updates[field];
      }
    }
  });

  if (updatePayload.email) {
    if (!EMAIL_REGEX.test(updatePayload.email)) {
      throw createHttpError(400, "Invalid email address format");
    }

    const normalizedEmail = updatePayload.email.toLowerCase();
    updatePayload.email = normalizedEmail;

    if (normalizedEmail !== user.email) {
      const existingUser = await AuthenticationUser.findOne({
        email: normalizedEmail,
      });
      if (existingUser) {
        throw createHttpError(409, "An account with this email already exists");
      }
      // Reset email verification when address changes
      updatePayload.emailVerified = false;
      updatePayload.verificationToken = "";
      updatePayload.verificationTokenExpiry = null;
    }
  }

  const updatedUser = await AuthenticationUser.findByIdAndUpdate(
    userId,
    { $set: updatePayload },
    { new: true, runValidators: true },
  );

  return sanitizeUser(updatedUser);
};

module.exports = {
  registerUser,
  loginUser,
  getAuthenticatedUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  updateUserProfile,
};
