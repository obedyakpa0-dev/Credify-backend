const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { connectDb } = require("../config/db");
const AuthenticationUser = require("../src/features/authentication/models/authenticationModel");
const environment = require("../config/environment");

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || "admin@credify.com")
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Credify Admin";
const FORCE_RESET = process.env.SEED_ADMIN_FORCE === "true";

const seedAdmin = async () => {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      "SEED_ADMIN_PASSWORD must be set before running this script",
    );
  }

  await connectDb();

  const existingAdmin = await AuthenticationUser.findOne({
    email: ADMIN_EMAIL,
  });

  if (existingAdmin && !FORCE_RESET) {
    console.log(
      `Admin already exists: ${ADMIN_EMAIL}. Set SEED_ADMIN_FORCE=true to reset it.`,
    );
    return;
  }

  const passwordHash = await bcrypt.hash(
    ADMIN_PASSWORD,
    environment.bcryptSaltRounds,
  );

  if (existingAdmin) {
    existingAdmin.password = passwordHash;
    existingAdmin.role = "admin";
    existingAdmin.name = ADMIN_NAME;
    existingAdmin.emailVerified = true;
    existingAdmin.isSuspended = false;
    await existingAdmin.save();
    console.log(`Admin account updated: ${ADMIN_EMAIL}`);
    return;
  }

  await AuthenticationUser.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: passwordHash,
    role: "admin",
    emailVerified: true,
    otpCode: "",
    otpExpiry: null,
    verificationToken: "",
    verificationTokenExpiry: null,
    resetToken: "",
    resetTokenExpiry: null,
  });

  console.log(`Admin account created: ${ADMIN_EMAIL}`);
};

seedAdmin()
  .catch((error) => {
    console.error("Failed to seed admin user:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
