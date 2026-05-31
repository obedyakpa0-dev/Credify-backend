const mongoose = require("mongoose");

const authenticationSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "company"],
      default: "user",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const AuthenticationUser =
  mongoose.models.AuthenticationUser ||
  mongoose.model("AuthenticationUser", authenticationSchema);

module.exports = AuthenticationUser;
