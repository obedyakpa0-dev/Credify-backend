const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthenticationUser",
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    points: {
      type: Number,
      min: 0,
      default: 0,
    },
    badgesCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    completedCourses: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const LeaderboardEntry =
  mongoose.models.LeaderboardEntry ||
  mongoose.model("LeaderboardEntry", leaderboardSchema);

module.exports = LeaderboardEntry;
