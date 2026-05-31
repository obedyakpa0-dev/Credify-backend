const mongoose = require("mongoose");

const paymentsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthenticationUser",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      default: "GHS",
    },
    provider: {
      type: String,
      trim: true,
      default: "manual",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentsSchema);

module.exports = Payment;
