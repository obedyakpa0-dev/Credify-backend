const express = require("express");
const cors = require("cors");
const environment = require("../config/environment");
const { sendError } = require("./common/http");
const authenticationRoutes = require("./features/authentication/routes/authenticationRoutes");
const profileRoutes = require("./features/profile/routes/profileRoutes");
const coursesRoutes = require("./features/courses/routes/coursesRoutes");
const badgesRoutes = require("./features/badges/routes/badgesRoutes");
const certificatesRoutes = require("./features/certificates/routes/certificatesRoutes");
const paymentsRoutes = require("./features/payments/routes/paymentsRoutes");
const leaderboardRoutes = require("./features/leaderboard/routes/leaderboardRoutes");
const dashboardRoutes = require("./features/dashboard/routes/dashboardRoutes");
const adminRoutes = require("./features/admin/routes/adminRoutes");
const companyRoutes = require("./features/company/routes/companyRoutes");
const projectsRoutes = require("./features/projects/routes/projectsRoutes");
const ratingsRoutes = require("./features/ratings/routes/ratingsRoutes");
const submissionsRoutes = require("./features/submissions/routes/submissionsRoutes");

const app = express();

const corsOrigin =
  environment.corsOrigin === "*"
    ? "*"
    : environment.corsOrigin
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

app.use(cors({ origin: corsOrigin }));
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use("/api/auth", authenticationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/badges", badgesRoutes);
app.use("/api/certificates", certificatesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/rating", ratingsRoutes);
app.use("/api/submissions", submissionsRoutes);

app.use((error, _req, res, _next) => sendError(res, error));

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connected successfully" });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

module.exports = app;
