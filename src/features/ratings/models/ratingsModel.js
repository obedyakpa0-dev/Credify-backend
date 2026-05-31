const mongoose = require("mongoose");
const { RATING_COLORS } = require("../../../shared/constants/ratingConstants");

const ratingsSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    raterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthenticationUser",
      required: true,
    },
    rating: {
      type: String,
      required: true,
      enum: RATING_COLORS,
      lowercase: true,
      trim: true,
    },
    points: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ratingsSchema.index({ projectId: 1, raterId: 1 }, { unique: true });

const Rating = mongoose.models.Rating || mongoose.model("Rating", ratingsSchema);

module.exports = Rating;
