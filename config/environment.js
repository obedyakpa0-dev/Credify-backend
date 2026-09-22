const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const toNumber = (value, fallbackValue) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
};

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const defaultDevJwtSecret = "credify_dummy_jwt_secret_key_1234567890_dev";
const jwtSecret = process.env.JWT_SECRET || (isProduction ? "" : defaultDevJwtSecret);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

if (isProduction) {
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be a unique secret of at least 32 characters in production");
  }
  if (!corsOrigin || corsOrigin === "*") {
    throw new Error("CORS_ORIGIN must explicitly list trusted frontend origins in production");
  }
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be set in production");
  }
  if ((process.env.PAYMENT_PROVIDER || "paystack").toLowerCase() !== "paystack") {
    throw new Error("PAYMENT_PROVIDER must be paystack in production");
  }
  if (!process.env.PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_WEBHOOK_SECRET) {
    throw new Error("Paystack secret and webhook secrets must be configured in production");
  }
}

const defaultMongoUri = "mongodb://127.0.0.1:27017/credify";

const environment = {
  nodeEnv,
  isProduction,
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI || defaultMongoUri,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || (isProduction ? "15m" : "7d"),
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  corsOrigin,
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "no-reply@credify.local",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};

if (environment.bcryptSaltRounds < 10 || environment.bcryptSaltRounds > 14) {
  throw new Error("BCRYPT_SALT_ROUNDS must be between 10 and 14");
}

module.exports = environment;
