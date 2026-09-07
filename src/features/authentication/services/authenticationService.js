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
  headline: userDocument.headline || "",
  skills: Array.isArray(userDocument.skills) ? userDocument.skills : [],
  avatarUrl: userDocument.avatarUrl || "",
  githubUrl: userDocument.githubUrl || "",
  linkedinUrl: userDocument.linkedinUrl || "",
  portfolioUrl: userDocument.portfolioUrl || "",
  graduationYear: userDocument.graduationYear || "",
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

const createOtp = () => String(crypto.randomInt(100000, 1000000));

const validatePasswordComplexity = (password) => {
  if (!password || typeof password !== "string") {
    throw createHttpError(400, "Password is required");
  }
  if (password.length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters long");
  }
  if (!/^(?=.*[A-Za-z])(?=.*[\d\W]).{8,}$/.test(password)) {
    throw createHttpError(
      400,
      "Password must contain at least one letter and at least one number or symbol",
    );
  }
};

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
    console.warn("[SMTP Warning] SMTP is not fully configured; skipping email delivery.");
    return;
  }

  try {
    const transporter = createEmailTransport();
    const info = await transporter.sendMail({
      from: environment.emailFrom,
      to,
      subject,
      text,
      html,
    });
    console.log(`[SMTP Success] Email sent to ${to}. MessageId: ${info.messageId}`);
  } catch (error) {
    console.error("[SMTP Error] Failed to deliver email:", error.message || error);
    // Graceful fallback: log the error so registration/verification request does not throw 500
  }
};

const getVerificationUrl = (token) =>
  `${environment.frontendUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;

const getResetUrl = (token) =>
  `${environment.frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

const sendOtpEmail = async (user, otp) => {
  const subject = "Your Credify verification code";
  const text = `Hi ${user.name},\n\nYour Credify verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nIf you did not create a Credify account, ignore this email.`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #e1ecf8; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f3460; margin: 0; font-size: 24px; font-weight: 700;">Credify</h2>
        <p style="color: #7a9ec0; font-size: 14px; margin-top: 4px;">Email Verification</p>
      </div>
      <div style="padding: 24px; background-color: #f8faff; border-radius: 8px; border: 1px solid #e1ecf8;">
        <h3 style="color: #0d1f35; margin-top: 0;">Hi ${user.name},</h3>
        <p style="color: #4a6080; font-size: 15px; line-height: 1.6;">Enter the code below to verify your Credify account. It expires in <strong>10 minutes</strong>.</p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #0f3460; color: #ffffff; font-size: 36px; font-weight: 800; letter-spacing: 12px; padding: 16px 32px; border-radius: 12px; font-family: monospace;">${otp}</div>
        </div>
        <p style="color: #7a9ec0; font-size: 12px; margin-bottom: 0; text-align: center;">Do not share this code with anyone. Credify will never ask for your code.<br/>If you did not sign up, safely ignore this email.</p>
      </div>
    </div>
  `;
  await sendEmail({ to: user.email, subject, text, html });
};

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = getVerificationUrl(token);
  const subject = "Verify your Credify Email Address";
  const text = `Hi ${user.name},\n\nPlease verify your Credify account email by visiting the following URL:\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create a Credify account, please ignore this email.`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #e1ecf8; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f3460; margin: 0; font-size: 24px; font-weight: 700;">Credify</h2>
        <p style="color: #7a9ec0; font-size: 14px; margin-top: 4px;">Verified Skills & Credentials</p>
      </div>
      <div style="padding: 24px; background-color: #f8faff; border-radius: 8px; border: 1px solid #e1ecf8;">
        <h3 style="color: #0d1f35; margin-top: 0;">Welcome to Credify, ${user.name}!</h3>
        <p style="color: #4a6080; font-size: 15px; line-height: 1.6;">
          Please confirm your email address to fully activate your account and start building your verified skills portfolio.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" target="_blank" style="background-color: #1565c0; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
            Verify My Email Address
          </a>
        </div>
        <p style="color: #7a9ec0; font-size: 13px; line-height: 1.5;">
          Or copy and paste this link into your browser:<br />
          <a href="${verifyUrl}" style="color: #1565c0; word-break: break-all;">${verifyUrl}</a>
        </p>
        <p style="color: #7a9ec0; font-size: 12px; margin-bottom: 0;">
          This link is valid for 24 hours. If you did not sign up for a Credify account, you can safely ignore this message.
        </p>
      </div>
    </div>
  `;
  await sendEmail({ to: user.email, subject, text, html });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = getResetUrl(token);
  const subject = "Reset your Credify Password";
  const text = `Hi ${user.name},\n\nClick the link below to reset your Credify password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request a password reset, ignore this email.`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #e1ecf8; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f3460; margin: 0; font-size: 24px; font-weight: 700;">Credify</h2>
        <p style="color: #7a9ec0; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
      </div>
      <div style="padding: 24px; background-color: #f8faff; border-radius: 8px; border: 1px solid #e1ecf8;">
        <h3 style="color: #0d1f35; margin-top: 0;">Hi ${user.name},</h3>
        <p style="color: #4a6080; font-size: 15px; line-height: 1.6;">
          We received a request to reset your password for your Credify account. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" target="_blank" style="background-color: #1565c0; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #7a9ec0; font-size: 13px; line-height: 1.5;">
          Or copy and paste this link into your browser:<br />
          <a href="${resetUrl}" style="color: #1565c0; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #7a9ec0; font-size: 12px; margin-bottom: 0;">
          This reset link is valid for 1 hour. If you did not request a password reset, please ignore this email or contact support.
        </p>
      </div>
    </div>
  `;
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

  validatePasswordComplexity(password);

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

  const otp = createOtp();
  const otpExpiry = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

  const createdUser = await AuthenticationUser.create({
    name: name.trim(),
    email: normalizedEmail,
    password: passwordHash,
    university: university ? university.trim() : "",
    programme: programme ? programme.trim() : "",
    companyName: companyName ? companyName.trim() : "",
    role,
    otpCode: otp,
    otpExpiry,
  });

  await sendOtpEmail(createdUser, otp);

  // Do NOT return an access token yet — user must verify OTP first
  return {
    email: normalizedEmail,
    requiresOtp: true,
    message: "Account created. Please check your email for your 6-digit verification code.",
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

const getAuthenticatedUser = async (token) => {
  if (!token || token === "undefined") {
    throw createHttpError(401, "Access token is required");
  }

  let payload;

  try {
    payload = jwt.verify(token, environment.jwtSecret, {
      algorithms: ["HS256"],
    });

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw createHttpError(401, "Session expired. Please sign in again.");
    }
    throw createHttpError(401, "Invalid token. Please sign in again.");
  }

  if (!payload.sub|| !payload.email || !payload.role) {
    throw createHttpError(401, "Invalid token payload. Please sign in again.");
  }

  const user = await AuthenticationUser.findById(payload.sub);
  if (!user) {
    throw createHttpError(401, "User not found. Please sign in again.");
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

  validatePasswordComplexity(password);

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
  }).select("+verificationToken +verificationTokenExpiry");

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
    "headline",
    "skills",
    "avatarUrl",
    "githubUrl",
    "linkedinUrl",
    "portfolioUrl",
    "graduationYear",
  ];

  const updatePayload = {};

  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      if (field === "skills") {
        if (Array.isArray(updates[field])) {
          updatePayload[field] = updates[field]
            .map((s) => (typeof s === "string" ? s.trim() : String(s).trim()))
            .filter(Boolean);
        } else if (typeof updates[field] === "string") {
          updatePayload[field] = updates[field]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          updatePayload[field] = [];
        }
      } else if (typeof updates[field] === "string") {
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

const resendVerification = async ({ email } = {}, currentUser) => {
  const targetEmail = email ? email.trim().toLowerCase() : currentUser?.email;

  if (!targetEmail) {
    throw createHttpError(400, "Email address is required");
  }

  const user = await AuthenticationUser.findOne({ email: targetEmail }).select("+verificationToken +verificationTokenExpiry");
  if (!user) {
    // Avoid user enumeration
    return { message: "If an unverified account exists with that email, a verification link has been sent." };
  }

  if (user.emailVerified) {
    return { message: "This email address is already verified." };
  }

  const verificationToken = createRandomToken();
  const verificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24);

  user.verificationToken = verificationToken;
  user.verificationTokenExpiry = verificationTokenExpiry;
  await user.save();

  await sendVerificationEmail(user, verificationToken);

  return { message: "Verification email sent successfully." };
};

const verifyOtp = async ({ email, otp } = {}) => {
  if (!email || !otp) {
    throw createHttpError(400, "email and otp are required");
  }

  const user = await AuthenticationUser.findOne({
    email: email.trim().toLowerCase(),
  }).select("+otpCode +otpExpiry +failedOtpAttempts");

  if (!user) {
    throw createHttpError(400, "No account found with that email address");
  }

  if (user.emailVerified) {
    // Already verified — just issue a token so they can proceed
    const accessToken = createAccessToken(user);
    return {
      accessToken,
      user: sanitizeUser(user),
      redirectPath: ROLE_REDIRECT_MAP[user.role] || "/dashboard",
    };
  }

  if (!user.otpCode || !user.otpExpiry) {
    throw createHttpError(400, "No verification code found. Please request a new one.");
  }

  if (new Date() > new Date(user.otpExpiry)) {
    throw createHttpError(400, "This code has expired. Please request a new verification code.");
  }

  if (String(user.otpCode).trim() !== String(otp).trim()) {
    const newFailedAttempts = (user.failedOtpAttempts || 0) + 1;
    if (newFailedAttempts >= 5) {
      user.otpCode = "";
      user.otpExpiry = null;
      user.failedOtpAttempts = 0;
      await user.save();
      throw createHttpError(
        400,
        "Too many invalid attempts. Your verification code has been invalidated. Please request a new code.",
      );
    }
    user.failedOtpAttempts = newFailedAttempts;
    await user.save();
    const remaining = 5 - newFailedAttempts;
    throw createHttpError(
      400,
      `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    );
  }

  user.emailVerified = true;
  user.otpCode = "";
  user.otpExpiry = null;
  user.failedOtpAttempts = 0;
  await user.save();

  const accessToken = createAccessToken(user);

  return {
    accessToken,
    user: sanitizeUser(user),
    redirectPath: ROLE_REDIRECT_MAP[user.role] || "/dashboard",
  };
};

const resendOtp = async ({ email } = {}) => {
  if (!email) {
    throw createHttpError(400, "email is required");
  }

  const user = await AuthenticationUser.findOne({
    email: email.trim().toLowerCase(),
  }).select("+otpCode +otpExpiry +failedOtpAttempts");

  if (!user) {
    // Avoid user enumeration
    return { message: "If that email has a pending account, a new code has been sent." };
  }

  if (user.emailVerified) {
    return { message: "This account is already verified. Please sign in." };
  }

  const otp = createOtp();
  const otpExpiry = new Date(Date.now() + 1000 * 60 * 10);

  user.otpCode = otp;
  user.otpExpiry = otpExpiry;
  user.failedOtpAttempts = 0;
  await user.save();

  await sendOtpEmail(user, otp);

  return { message: "A new verification code has been sent to your email." };
};

const changePassword = async (userId, { currentPassword, newPassword } = {}) => {
  if (!userId) {
    throw createHttpError(400, "userId is required");
  }
  if (!currentPassword || !newPassword) {
    throw createHttpError(400, "Current password and new password are required");
  }

  validatePasswordComplexity(newPassword);

  const user = await AuthenticationUser.findById(userId).select("+password");
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw createHttpError(400, "Current password is incorrect");
  }

  user.password = await bcrypt.hash(newPassword, environment.bcryptSaltRounds);
  await user.save();

  return { message: "Password updated successfully" };
};

module.exports = {
  registerUser,
  loginUser,
  getAuthenticatedUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  verifyOtp,
  resendOtp,
  resendVerification,
  updateUserProfile,
  changePassword,
};
