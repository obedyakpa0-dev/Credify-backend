const authenticationService = require("../services/authenticationService");

const resolveStatusCode = (error) => {
  if (error.statusCode) {
    return error.statusCode;
  }

  if (error.name === "ValidationError" || error.name === "Validation Error" || error.name === "CastError") {
    return 400;
  }

  return 500;
};

const handleErrorResponse = (res, error) => {
  const statusCode = resolveStatusCode(error);
  const message =
    statusCode === 500
      ? "Something went wrong. Please try again later."
      : error.message;

  res.status(statusCode).json({
    success: false,
    message,
  });
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

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
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
    const user = await authenticationService.getAuthenticatedUser(
      req.headers.authorization,
    );

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        user,
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

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  getMe,
  updateProfile,
};
