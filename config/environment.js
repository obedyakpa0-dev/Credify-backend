const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const toNumber = (value, fallbackValue) => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
};

const environment = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/credify",
  jwtSecret:
    process.env.JWT_SECRET ||
    "change-this-jwt-secret-before-production-usage",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  corsOrigin: process.env.CORS_ORIGIN || "*",
};

if (
  environment.nodeEnv === "production" &&
  environment.jwtSecret === "change-this-jwt-secret-before-production-usage"
) {
  throw new Error("JWT_SECRET must be set in production");
}

module.exports = environment;
