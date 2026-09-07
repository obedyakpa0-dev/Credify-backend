const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const environment = require("../config/environment");
const { sendError } = require("./common/http");
const authenticationRoutes = require("./features/authentication/routes/authenticationRoutes");
const profileRoutes = require("./features/profile/routes/profileRoutes");
const certificatesRoutes = require("./features/certificates/routes/certificatesRoutes");
const paymentsRoutes = require("./features/payments/routes/paymentsRoutes");
const dashboardRoutes = require("./features/dashboard/routes/dashboardRoutes");
const adminRoutes = require("./features/admin/routes/adminRoutes");
const companyRoutes = require("./features/company/routes/companyRoutes");
const projectsRoutes = require("./features/projects/routes/projectsRoutes");
const ratingsRoutes = require("./features/ratings/routes/ratingsRoutes");
const submissionsRoutes = require("./features/submissions/routes/submissionsRoutes");
const leaderboardRoutes = require("./features/leaderboard/routes/leaderboardRoutes");
const contactRoutes = require("./features/contact/routes/contactRoutes");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());

// ── Security Headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // managed by the frontend framework
  }),
);

// ── CORS Configuration ───────────────────────────────────────────────────────
const allowedOrigins =
  environment.corsOrigin === "*"
    ? true
    : environment.corsOrigin
        .split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins === true) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (
        Array.isArray(allowedOrigins) &&
        (allowedOrigins.includes(normalizedOrigin) ||
          allowedOrigins.includes("*"))
      ) {
        return callback(null, true);
      }

      // Allow local development origins automatically (localhost & 127.0.0.1 on any port)
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow ngrok domains during testing
      if (/^https:\/\/.*\.ngrok-free\.(app|dev)$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      const corsError = new Error("CORS policy: Origin not allowed");
      corsError.statusCode = 403;
      return callback(corsError);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

app.set("trust proxy", 1);

// ── Paystack webhook needs raw body BEFORE express.json() ────────────────────
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// ── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── Global Rate Limiter — 500 req/15 min per IP ──────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use(globalLimiter);

// ── Auth Rate Limiter — 20 req/15 min per IP (Brute-Force Protection) ───────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again in 15 minutes.",
  },
});

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Credify backend API",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Credify backend is running",
  });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authenticationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/certificates", certificatesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/submissions", submissionsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/contact", contactRoutes);

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((error, _req, res, _next) => {
  if (environment.nodeEnv === "production" && !error.statusCode) {
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
  return sendError(res, error);
});

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

module.exports = app;
