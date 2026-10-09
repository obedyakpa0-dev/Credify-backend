require("dotenv").config();

const mongoose = require("mongoose");
const AuthenticationUser = require("../src/features/authentication/models/authenticationModel");

const checkAdmin = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/credify",
    );

    const admin = await AuthenticationUser.findOne({
      email: "admin@credify.com",
    }).select("+password");

    if (!admin) {
      console.log("Admin Not Found");
      return;
    }

    console.log("Admin Found");
    console.log("ID: ", admin._id.toString());
    console.log("Email: ", admin.get("email"));
    console.log("Role: ", admin.get("role"));
    console.log("Email Verified: ", admin.get("emailVerified"));
    console.log("Password hash exists", Boolean(admin.password));
  } catch (error) {
    console.error(error.message);
  } finally {
    await mongoose.disconnect();
  }
};

checkAdmin();
