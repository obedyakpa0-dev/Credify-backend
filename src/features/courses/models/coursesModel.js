const mongoose = require("mongoose");

const coursesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "general",
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    points: {
      type: Number,
      min: 0,
      default: 0,
    },
    durationHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Course = mongoose.models.Course || mongoose.model("Course", coursesSchema);

module.exports = Course;
