const authenticationService = require("../services/authenticationService");
const { setCsrfCookie } = require("../../../shared/middleware/securityMiddleware");
const environment = require("../../../../config/environment");

const getCookieOptions = (req) => {
  const isProduction = environment.nodeEnv === "production";
  const useSecureCookie = req?.secure === true || isProduction;
  return {
    httpOnly: true,
    secure: useSecureCookie,
    sameSite: isProduction ? "none" : "lax",
    maxAge: isProduction ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
};

const resolveStatusCode = (error) => {
  if (error.statusCode) {
    return error.statusCode;
  }

  if (
    error.name === "ValidationError" ||
    error.name === "Validation Error" ||
    error.name === "CastError"
  ) {
    return 400;
  }

  return 500;
};

const handleErrorResponse = (res, error) => {
  const statusCode = resolveStatusCode(error);
  if (statusCode >= 500) {
    console.error("[Auth Error 500]", error);
  } else {
    console.warn(`[Auth ${statusCode}] ${error.message || error}`);
  }
  const message =
    statusCode >= 500 && environment.nodeEnv === "production"
      ? "Something went wrong. Please try again later."
      : error.message || "Something went wrong. Please try again later.";

  res.status(statusCode).json({ success: false, message });
};

const register = async (req, res) => {
  try {
    const result = await authenticationService.registerUser(req.body);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: result,
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const login = async (req, res) => {
  try {
    const result = await authenticationService.loginUser(req.body);

    res.cookie("token", result.accessToken, getCookieOptions(req));
    res.cookie("refreshToken", result.refreshToken, { ...getCookieOptions(req), maxAge: 7 * 24 * 60 * 60 * 1000 });
    setCsrfCookie(res);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        redirectPath: result.redirectPath,
      },
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    await authenticationService.requestPasswordReset(req.body);

    return res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been sent.",
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const resetPassword = async (req, res) => {
  try {
    await authenticationService.resetPassword(req.body);

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const verifyEmail = async (req, res) => {
  try {
    await authenticationService.verifyEmail(req.query);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const getMe = async (req, res) => {
  try {
    // requireAuth middleware already verified the token and populated req.user
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const updateProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const updatedUser = await authenticationService.updateUserProfile(
      req.user.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const resendVerification = async (req, res) => {
  try {
    const result = await authenticationService.resendVerification(
      req.body,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const result = await authenticationService.verifyOtp(req.body);

    res.cookie("token", result.accessToken, getCookieOptions(req));
    res.cookie("refreshToken", result.refreshToken, { ...getCookieOptions(req), maxAge: 7 * 24 * 60 * 60 * 1000 });
    setCsrfCookie(res);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        user: result.user,
        redirectPath: result.redirectPath,
      },
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const resendOtp = async (req, res) => {
  try {
    const result = await authenticationService.resendOtp(req.body);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const refresh = async (req, res) => {
  try {
    const result = await authenticationService.refreshSession(req.cookies?.refreshToken);
    res.cookie("token", result.accessToken, getCookieOptions(req));
    res.cookie("refreshToken", result.refreshToken, { ...getCookieOptions(req), maxAge: 7 * 24 * 60 * 60 * 1000 });
    setCsrfCookie(res);
    return res.status(200).json({ success: true, message: "Session refreshed", data: { user: result.user, redirectPath: result.redirectPath } });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const csrf = (_req, res) => {
  const csrfToken = setCsrfCookie(res);
  return res.status(200).json({ success: true, data: { csrfToken } });
};

const logout = async (req, res) => {
  try {
    if (req.cookies?.refreshToken) await authenticationService.revokeRefreshToken(req.cookies.refreshToken);
  } catch (_error) {}
  res.clearCookie("token", getCookieOptions(req));
  res.clearCookie("refreshToken", { ...getCookieOptions(req), maxAge: 0 });
  res.clearCookie("csrfToken", { ...getCookieOptions(req), httpOnly: false, maxAge: 0 });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

const changePassword = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await authenticationService.changePassword(
      req.user.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerification,
  verifyOtp,
  resendOtp,
  logout,
  getMe,
  updateProfile,
  changePassword,
  refresh,
  csrf,
};
