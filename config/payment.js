const environment = require("./environment");

const paymentConfig = {
  provider: process.env.PAYMENT_PROVIDER || "manual",
  currency: process.env.PAYMENT_CURRENCY || "GHS",
  callbackUrl:
    process.env.PAYMENT_CALLBACK_URL ||
    `http://localhost:${environment.port}/api/payments/callback`,
  paystack: {
    baseUrl: process.env.PAYSTACK_BASE_URL || "https://api.paystack.co",
    secretKey: process.env.PAYSTACK_SECRET_KEY || "",
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
    webhookSecret:
      process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || "",
  },
};

module.exports = paymentConfig;
