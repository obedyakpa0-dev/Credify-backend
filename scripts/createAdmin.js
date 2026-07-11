/**
 * Admin Seed Script — Credify Backend
 * ------------------------------------
 * Creates a new admin account directly in the database.
 * Admin registration is intentionally blocked through the public API,
 * so use this script to create admin accounts safely.
 *
 * Usage:
 *   node scripts/createAdmin.js
 *
 * Or with custom values via environment variables:
 *   ADMIN_NAME="Super Admin" ADMIN_EMAIL="admin@credify.com" ADMIN_PASSWORD="SecurePass123" node scripts/createAdmin.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const environment = require("../config/environment");
const AuthenticationUser = require("../src/features/authentication/models/authenticationModel");

// ── Admin credentials ────────────────────────────────────────────────────────
// Override these by setting environment variables before running the script,
// or just edit the defaults below.
const ADMIN_NAME = process.env.ADMIN_NAME || "Credify Admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@credify.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234!";
// ─────────────────────────────────────────────────────────────────────────────

const createAdmin = async () => {
  try {
    console.log(`Using MongoDB: ${environment.mongoUri}`);
    await mongoose.connect(environment.mongoUri);
    console.log(" Connected to MongoDB\n");

    const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();

    // Check if an admin with this email already exists
    const existing = await AuthenticationUser.findOne({
      email: normalizedEmail,
    });
    if (existing) {
      if (existing.role === "admin") {
        console.log(`Admin already exists: ${normalizedEmail}`);
        console.log(" No changes made. Exiting.");
      } else {
        // Promote existing non-admin user to admin
        existing.role = "admin";
        await existing.save();
        console.log(` Promoted existing user to admin: ${normalizedEmail}`);
      }
      await mongoose.disconnect();
      process.exit(0);
    }

    // Validate password strength
    if (ADMIN_PASSWORD.length < 8) {
      console.error("Password must be at least 8 characters.");
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(
      ADMIN_PASSWORD,
      environment.bcryptSaltRounds,
    );

    const admin = await AuthenticationUser.create({
      name: ADMIN_NAME.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role: "admin",
      university: "",
      programme: "",
      companyName: "",
    });

    console.log(" Admin account created successfully!");
    console.log("─────────────────────────────────────────");
    console.log(`   Name    : ${admin.name}`);
    console.log(`   Email   : ${admin.email}`);
    console.log(`   Role    : ${admin.role}`);
    console.log(`   ID      : ${admin._id}`);
    console.log("─────────────────────────────────────────");
    console.log("\n   You can now log in at: http://localhost:5173/login");
    console.log("   Use the email and password you configured above.\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("  Failed to create admin:", error.message);
    await mongoose.disconnect().catch(() => { });
    process.exit(1);
  }
};

createAdmin();
