const mongoose = require("mongoose");

const authenticationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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

    university: {
      type: String,
      default: "",
    },

    programme: {
      type: String,
      default: "",
    },

    companyName: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    industry: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
      default: "",
    },

    verificationTokenExpiry: {
      type: Date,
    },

    resetToken: {
      type: String,
      default: "",
    },

    resetTokenExpiry: {
      type: Date,
    },

    role: {
      type: String,
      enum: ["student", "graduate", "company", "admin"],
      default: "student",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports =
  mongoose.models.AuthenticationUser ||
  mongoose.model("AuthenticationUser", authenticationSchema);
