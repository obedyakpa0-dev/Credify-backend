const mongoose = require("mongoose");

const certificatesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthenticationUser",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Certificate =
  mongoose.models.Certificate || mongoose.model("Certificate", certificatesSchema);

module.exports = Certificate;
