const crypto = require("crypto");
const https = require("https");
const mongoose = require("mongoose");
const Payment = require("../models/paymentsModel");
const AuthenticationUser = require("../../authentication/models/authenticationModel");
const paymentConfig = require("../../../../config/payment");
const { createHttpError } = require("../../../common/http");

const allowedStatus = ["pending", "paid", "failed", "refunded"];
const privilegedRoles = ["admin", "company"];

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const createPaymentReference = () =>
  `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const toPaymentResponse = (paymentDocument) => ({
  id: paymentDocument._id.toString(),
  userId: paymentDocument.userId.toString(),
  amount: paymentDocument.amount,
  currency: paymentDocument.currency,
  provider: paymentDocument.provider,
  status: paymentDocument.status,
  reference: paymentDocument.reference,
  metadata: paymentDocument.metadata,
  createdAt: paymentDocument.createdAt,
  updatedAt: paymentDocument.updatedAt,
});

const createRequestPromise = (url, options = {}) =>
  new Promise((resolve, reject) => {
    const request = https.request(url, options, (response) => {
      const chunks = [];

      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });

    request.on("error", reject);

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });

const paystackRequest = async (path, { method = "GET", body } = {}) => {
  if (!paymentConfig.paystack.secretKey) {
    throw createHttpError(
      500,
      "PAYSTACK_SECRET_KEY is not configured. Add it to environment variables."
    );
  }

  const payload = body ? JSON.stringify(body) : null;
  const headers = {
    Authorization: `Bearer ${paymentConfig.paystack.secretKey}`,
  };

  if (payload) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(payload);
  }

  let requestResult;
  try {
    requestResult = await createRequestPromise(`${paymentConfig.paystack.baseUrl}${path}`, {
      method,
      headers,
      body: payload,
    });
  } catch (_error) {
    throw createHttpError(502, "Could not connect to Paystack");
  }

  const { statusCode, body: responseBody } = requestResult;

  let parsedResponse = {};
  if (responseBody) {
    try {
      parsedResponse = JSON.parse(responseBody);
    } catch (_error) {
      throw createHttpError(502, "Invalid response from Paystack API");
    }
  }

  if (statusCode >= 400 || parsedResponse.status === false) {
    throw createHttpError(
      502,
      parsedResponse.message || "Paystack request failed. Please try again."
    );
  }

  return parsedResponse;
};

const mapPaystackStatusToPaymentStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (normalizedStatus === "success") {
    return "paid";
  }

  if (["failed", "abandoned", "error"].includes(normalizedStatus)) {
    return "failed";
  }

  if (normalizedStatus === "reversed") {
    return "refunded";
  }

  return "pending";
};

const getPaystackMetadata = (payment, key) => {
  if (!payment.metadata || typeof payment.metadata !== "object") {
    return {};
  }

  const paystackData = payment.metadata.paystack;
  if (!paystackData || typeof paystackData !== "object") {
    return {};
  }

  if (!key) {
    return paystackData;
  }

  const value = paystackData[key];
  return value && typeof value === "object" ? value : {};
};

const getPaymentByReference = async (reference) => {
  const payment = await Payment.findOne({ reference: String(reference).trim() });
  if (!payment) {
    throw createHttpError(404, "Payment not found for reference");
  }

  return payment;
};

const ensurePaymentAccess = (payment, currentUser) => {
  if (!currentUser?.id) {
    return;
  }

  if (privilegedRoles.includes(currentUser.role)) {
    return;
  }

  if (payment.userId.toString() !== currentUser.id) {
    throw createHttpError(403, "You are not allowed to access this payment");
  }
};

const resolvePayer = async (
  { userId, email } = {},
  currentUser,
  { requireEmail = false, allowPrivilegedOverride = true } = {}
) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  const isPrivileged = privilegedRoles.includes(currentUser.role);
  let resolvedUserId = currentUser.id;
  let resolvedEmail = currentUser.email || "";

  if (allowPrivilegedOverride && isPrivileged && userId) {
    assertObjectId(userId, "userId");

    const existingUser = await AuthenticationUser.findById(userId);
    if (!existingUser) {
      throw createHttpError(404, "User not found for payment");
    }

    resolvedUserId = existingUser._id.toString();
    resolvedEmail = existingUser.email || resolvedEmail;
  }

  if (allowPrivilegedOverride && isPrivileged && email) {
    resolvedEmail = String(email).trim().toLowerCase();
  }

  if (requireEmail && !String(resolvedEmail || "").trim()) {
    throw createHttpError(400, "email is required");
  }

  return {
    userId: resolvedUserId,
    email: String(resolvedEmail || "").trim().toLowerCase(),
  };
};

const updatePaymentFromPaystackVerification = async (reference, verificationData) => {
  const payment = await getPaymentByReference(reference);

  payment.provider = "paystack";
  payment.status = mapPaystackStatusToPaymentStatus(verificationData.status);
  payment.metadata = {
    ...(payment.metadata || {}),
    paystack: {
      ...getPaystackMetadata(payment),
      verify: verificationData,
    },
  };

  await payment.save();

  return payment;
};

const updatePaymentStatusById = async (paymentId, status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (!allowedStatus.includes(normalizedStatus)) {
    throw createHttpError(400, `status must be one of: ${allowedStatus.join(", ")}`);
  }

  const payment = await Payment.findByIdAndUpdate(
    paymentId,
    { status: normalizedStatus },
    { new: true, runValidators: true }
  );

  if (!payment) {
    throw createHttpError(404, "Payment not found");
  }

  return payment;
};

const initializePaystackPayment = async (
  { amount, currency, metadata, callbackUrl, userId, email } = {},
  currentUser
) => {
  const payer = await resolvePayer(
    { userId, email },
    currentUser,
    { requireEmail: true, allowPrivilegedOverride: true }
  );

  if (amount === undefined) {
    throw createHttpError(400, "amount is required");
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createHttpError(400, "amount must be a valid positive number");
  }

  const reference = createPaymentReference();
  const safeMetadata = metadata && typeof metadata === "object" ? metadata : {};

  const paystackInitializeResponse = await paystackRequest("/transaction/initialize", {
    method: "POST",
    body: {
      email: payer.email,
      amount: Math.round(numericAmount * 100),
      currency: String(currency || paymentConfig.currency).toUpperCase(),
      reference,
      callback_url: callbackUrl || paymentConfig.callbackUrl,
      metadata: {
        ...safeMetadata,
        userId: payer.userId,
      },
    },
  });

  const createdPayment = await Payment.create({
    userId: payer.userId,
    amount: numericAmount,
    currency: String(currency || paymentConfig.currency).toUpperCase(),
    provider: "paystack",
    status: "pending",
    reference,
    metadata: {
      ...safeMetadata,
      paystack: {
        initialize: paystackInitializeResponse.data,
      },
    },
  });

  return {
    payment: toPaymentResponse(createdPayment),
    checkout: {
      authorizationUrl: paystackInitializeResponse.data.authorization_url,
      accessCode: paystackInitializeResponse.data.access_code,
      reference: paystackInitializeResponse.data.reference,
    },
  };
};

const verifyPaystackPayment = async (reference, currentUser) => {
  if (!reference) {
    throw createHttpError(400, "reference is required");
  }

  const normalizedReference = String(reference).trim();
  const existingPayment = await getPaymentByReference(normalizedReference);
  ensurePaymentAccess(existingPayment, currentUser);

  const paystackVerificationResponse = await paystackRequest(
    `/transaction/verify/${encodeURIComponent(normalizedReference)}`
  );

  const updatedPayment = await updatePaymentFromPaystackVerification(
    normalizedReference,
    paystackVerificationResponse.data
  );

  return {
    payment: toPaymentResponse(updatedPayment),
    verification: {
      providerStatus: paystackVerificationResponse.data.status || "unknown",
      paidAt: paystackVerificationResponse.data.paid_at || null,
      channel: paystackVerificationResponse.data.channel || null,
    },
  };
};

const assertPaystackWebhookSignature = (rawPayload, signature) => {
  const signatureValue = Array.isArray(signature) ? signature[0] : signature;
  if (!signatureValue) {
    throw createHttpError(401, "Missing x-paystack-signature header");
  }

  const webhookSecret = paymentConfig.paystack.webhookSecret;
  if (!webhookSecret) {
    throw createHttpError(
      500,
      "PAYSTACK_WEBHOOK_SECRET is not configured. Add it to environment variables."
    );
  }

  const computedSignature = crypto
    .createHmac("sha512", webhookSecret)
    .update(rawPayload)
    .digest("hex");

  if (computedSignature !== String(signatureValue).trim().toLowerCase()) {
    throw createHttpError(401, "Invalid Paystack webhook signature");
  }
};

const parseWebhookPayload = (rawPayload) => {
  try {
    return JSON.parse(rawPayload.toString("utf8"));
  } catch (_error) {
    throw createHttpError(400, "Invalid webhook payload");
  }
};

const processPaystackWebhook = async ({ rawPayload, signature } = {}) => {
  if (!Buffer.isBuffer(rawPayload)) {
    throw createHttpError(400, "Webhook raw payload must be provided");
  }

  assertPaystackWebhookSignature(rawPayload, signature);

  const payload = parseWebhookPayload(rawPayload);
  const event = payload.event;
  const reference = payload.data && payload.data.reference;

  if (!event || !reference) {
    throw createHttpError(400, "Webhook payload is missing event or reference");
  }

  if (event !== "charge.success" && event !== "charge.failed") {
    return {
      acknowledged: true,
      ignored: true,
      event,
    };
  }

  const verificationResult = await verifyPaystackPayment(reference);

  return {
    acknowledged: true,
    event,
    payment: verificationResult.payment,
  };
};

const createPayment = async (
  { amount, currency, metadata, provider, userId, email } = {},
  currentUser
) => {
  const payer = await resolvePayer(
    { userId, email },
    currentUser,
    { requireEmail: false, allowPrivilegedOverride: true }
  );

  if (amount === undefined) {
    throw createHttpError(400, "amount is required");
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createHttpError(400, "amount must be a valid positive number");
  }

  const safeMetadata = metadata && typeof metadata === "object" ? metadata : {};

  const createdPayment = await Payment.create({
    userId: payer.userId,
    amount: numericAmount,
    currency: String(currency || paymentConfig.currency).toUpperCase(),
    provider: provider || paymentConfig.provider,
    status: "pending",
    reference: createPaymentReference(),
    metadata: safeMetadata,
  });

  return toPaymentResponse(createdPayment);
};

const listPayments = async ({ userId, status, limit = 20, page = 1 } = {}, currentUser) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;
  const filter = {};
  const isPrivileged = privilegedRoles.includes(currentUser.role);

  if (status) {
    const normalizedStatus = String(status).trim().toLowerCase();
    if (!allowedStatus.includes(normalizedStatus)) {
      throw createHttpError(400, `status must be one of: ${allowedStatus.join(", ")}`);
    }
    filter.status = normalizedStatus;
  }

  if (userId) {
    assertObjectId(userId, "userId");
    if (isPrivileged) {
      filter.userId = userId;
    }
  }

  if (!isPrivileged) {
    filter.userId = currentUser.id;
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Payment.countDocuments(filter),
  ]);

  return {
    items: payments.map(toPaymentResponse),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
    },
  };
};

const updatePaymentStatus = async (paymentId, status, currentUser) => {
  if (!currentUser?.id) {
    throw createHttpError(401, "Authentication required");
  }

  if (!privilegedRoles.includes(currentUser.role)) {
    throw createHttpError(403, "Only admin/company can update payment status");
  }

  if (!paymentId || !status) {
    throw createHttpError(400, "paymentId and status are required");
  }

  assertObjectId(paymentId, "paymentId");
  const updatedPayment = await updatePaymentStatusById(paymentId, status);

  return toPaymentResponse(updatedPayment);
};

const processPaymentCallback = async ({ reference, trxref, status } = {}) => {
  const normalizedReference = String(reference || trxref || "").trim();

  if (!normalizedReference) {
    throw createHttpError(400, "reference is required");
  }

  if ((paymentConfig.provider || "").toLowerCase() === "paystack") {
    const verificationResult = await verifyPaystackPayment(normalizedReference);
    return verificationResult.payment;
  }

  if (!status) {
    throw createHttpError(400, "status is required");
  }

  const payment = await getPaymentByReference(normalizedReference);
  const updatedPayment = await updatePaymentStatusById(payment._id.toString(), status);
  return toPaymentResponse(updatedPayment);
};

module.exports = {
  initializePaystackPayment,
  verifyPaystackPayment,
  processPaystackWebhook,
  createPayment,
  listPayments,
  updatePaymentStatus,
  processPaymentCallback,
};
