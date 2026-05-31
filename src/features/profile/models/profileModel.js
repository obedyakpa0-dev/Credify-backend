const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthenticationUser",
      required: true,
      unique: true,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },
    avatarUrl: {
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

const Profile = mongoose.models.Profile || mongoose.model("Profile", profileSchema);

module.exports = Profile;
