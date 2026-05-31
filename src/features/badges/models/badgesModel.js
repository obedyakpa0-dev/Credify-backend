const mongoose = require("mongoose");

const badgesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    iconUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    pointsRequired: {
      type: Number,
      min: 0,
      default: 0,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "general",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Badge = mongoose.models.Badge || mongoose.model("Badge", badgesSchema);

module.exports = Badge;
