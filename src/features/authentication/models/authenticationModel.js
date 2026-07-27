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

    supportEmail: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationCode: {
      type: String,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      select: false,
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

    isSuspended: {
      type: Boolean,
      default: false,
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
