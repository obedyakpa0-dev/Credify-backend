const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const resolveStatusCode = (error) => {
  if (error.statusCode) {
    return error.statusCode;
  }

  if (error.name === "Validation Error") {
    return 400;
  }

  if (error.name === "Cast Error") {
    return 400;
  }

  return 500;
};

const sendSuccess = (res, { statusCode = 200, message = "Success", data = {} }) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

  const sendError = (
    res,
    error,
    fallbackMessage = "Something went wrong. Please try again later."
  ) => {
  const statusCode = resolveStatusCode(error);
  const message = statusCode === 500 ? fallbackMessage : error.message;

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = {
  createHttpError,
  sendSuccess,
  sendError,
};
