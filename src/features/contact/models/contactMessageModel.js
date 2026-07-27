const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject: { type: String, trim: true, maxlength: 160, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema);
