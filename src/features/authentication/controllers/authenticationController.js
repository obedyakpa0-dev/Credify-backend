const authenticationService = require("../services/authenticationService");

const resolveStatusCode = (error) => {
  if (error.statusCode) {
    return error.statusCode;
  }

  if (error.name === "Validation Error") {
    return 400;
  }

  return 500;
};

const handleErrorResponse = (res, error) => {
  const statusCode = resolveStatusCode(error);
  const message =
    statusCode === 500 ? "Something went wrong. Please try again later." : error.message;

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

const getMe = async (req, res) => {
  try {
    const user = await authenticationService.getAuthenticatedUser(
      req.headers.authorization
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

module.exports = {
  register,
  login,
  getMe,
};
