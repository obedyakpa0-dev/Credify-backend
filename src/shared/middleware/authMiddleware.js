const authenticationService = require("../../features/authentication/services/authenticationService");
const { createHttpError } = require("../../common/http");

/**
 * requireAuth — validates Bearer JWT and attaches req.user.
 * Throws 401 if missing/invalid/expired, 403 if suspended.
 */
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

/**
 * requireRoles — enforces role-based access control after requireAuth.
 * @param {string[]} roles - allowed roles
 */
const requireRoles = (roles = []) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, _res, next) => {
    if (!req.user) {
      return next(createHttpError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        createHttpError(403, "You do not have permission for this action")
      );
    }

    return next();
  };
};

/**
 * requireSelf — ensures the authenticated user can only access their own
 * resource. Admins are exempt.
 *
 * Usage: router.get("/:userId/...", requireAuth, requireSelf("userId"), handler)
 *
 * @param {string} paramName - the route param that holds the target userId
 */
const requireSelf = (paramName = "userId") => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(createHttpError(401, "Authentication required"));
    }

    // Admins can access any user's resource
    if (req.user.role === "admin") {
      return next();
    }

    const targetId = req.params[paramName];
    if (!targetId || targetId !== req.user.id) {
      return next(
        createHttpError(403, "You can only access your own resources")
      );
    }

    return next();
  };
};

module.exports = {
  requireAuth,
  requireRoles,
  requireSelf,
};
