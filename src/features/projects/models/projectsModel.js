const mongoose = require("mongoose");

const projectsSchema = new mongoose.Schema(
  {
    ownerId: {
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
    description: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "active", "completed", "archived"],
      default: "draft",
    },
    techStack: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    repositoryUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    liveUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Project = mongoose.models.Project || mongoose.model("Project", projectsSchema);

module.exports = Project;
