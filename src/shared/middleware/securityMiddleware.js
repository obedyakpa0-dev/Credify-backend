const crypto = require("crypto");
const environment = require("../../../config/environment");

const CSRF_COOKIE = "csrfToken";
const CSRF_HEADER = "x-csrf-token";

const getAllowedOrigins = () => environment.corsOrigin.split(",").map((v) => v.trim().replace(/\/$/, "")).filter(Boolean);

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const createCsrfToken = () => {
  const nonce = crypto.randomBytes(32).toString("hex");
  const signature = crypto.createHmac("sha256", environment.jwtSecret).update(nonce).digest("hex");
  return `${nonce}.${signature}`;
};

const isValidCsrfToken = (token) => {
  if (typeof token !== "string") return false;
  const [nonce, signature] = token.split(".");
  if (!nonce || !signature || nonce.length !== 64 || signature.length !== 64) return false;
  const expected = crypto.createHmac("sha256", environment.jwtSecret).update(nonce).digest("hex");
  return safeEqual(signature, expected);
};

const setCsrfCookie = (res) => {
  const token = createCsrfToken();
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: environment.isProduction,
    sameSite: environment.isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return token;
};

const isPublicAuthRoute = (req) => {
  const url = req.originalUrl || req.url || req.path || "";
  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register") ||
    url.includes("/api/auth/verify-otp") ||
    url.includes("/api/auth/forgot-password") ||
    url.includes("/api/auth/reset-password") ||
    url.includes("/api/auth/resend-otp") ||
    url.includes("/api/auth/resend-verification") ||
    url.includes("/api/auth/csrf") ||
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/logout")
  );
};

const requireTrustedOrigin = (req, _res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  if (isPublicAuthRoute(req)) return next();
  if (!req.cookies?.token && !req.cookies?.refreshToken) return next();

  const origin = req.get("origin");
  const referer = req.get("referer");
  if (!origin && !referer) return next();

  let candidate;
  try {
    candidate = (origin || new URL(referer).origin).replace(/\/$/, "");
  } catch (_error) {
    const error = new Error("Invalid request origin");
    error.statusCode = 403;
    return next(error);
  }
  if (getAllowedOrigins().includes(candidate)) return next();

  const error = new Error("Request origin is not allowed");
  error.statusCode = 403;
  return next(error);
};

const requireCsrf = (req, _res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  if (isPublicAuthRoute(req)) return next();
  // Bearer-token clients are not exposed to cookie CSRF.
  if (!req.cookies?.token && !req.cookies?.refreshToken) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (!isValidCsrfToken(cookieToken) || !safeEqual(cookieToken, headerToken)) {
    const error = new Error("Invalid CSRF token");
    error.statusCode = 403;
    return next(error);
  }
  return next();
};

module.exports = { setCsrfCookie, requireCsrf, requireTrustedOrigin };

