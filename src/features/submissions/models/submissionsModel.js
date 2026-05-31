const mongoose = require("mongoose");

const submissionsSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthenticationUser",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 180,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "reviewing", "approved", "rejected"],
      default: "pending",
    },
    reviewerNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Submission =
  mongoose.models.Submission || mongoose.model("Submission", submissionsSchema);

module.exports = Submission;
