const authenticationService = require("../../features/authentication/services/authenticationService");
const { createHttpError } = require("../../common/http");

const requireAuth = async (req, _res, next) => {
  try {
    const user = await authenticationService.getAuthenticatedUser(
      req.headers.authorization
    );
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireRoles = (roles = []) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, _res, next) => {
    if (!req.user) {
      return next(createHttpError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createHttpError(403, "You do not have permission for this action"));
    }

    return next();
  };
};

module.exports = {
  requireAuth,
  requireRoles,
};
