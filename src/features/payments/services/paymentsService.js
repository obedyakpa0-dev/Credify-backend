const crypto = require("crypto");
const https = require("https");
const mongoose = require("mongoose");
const Payment = require("../models/paymentsModel");
const AuthenticationUser = require("../../authentication/models/authenticationModel");
const paymentConfig = require("../../../../config/payment");
const { createHttpError } = require("../../../common/http");

const allowedStatus = ["pending", "paid", "failed", "refunded"];
const privilegedRoles = ["admin"];

const assertObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `${fieldName} must be a valid id`);
  }
};

const createPaymentReference = () =>
  `PAY-${Date.now()}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

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

    request.setTimeout(10000, () => request.destroy(new Error("Paystack request timed out")));
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

const triggerCertificateCreation = async (payment) => {
  try {
    const purpose = payment.metadata?.purpose;
    const projectId = payment.metadata?.certificateId || payment.metadata?.projectId;
    if (purpose === "certificate" && projectId) {
      const certificatesService = require("../../certificates/services/certificatesService");
      const Certificate = require("../../certificates/models/certificatesModel");
      const Submission = require("../../submissions/models/submissionsModel");
      const approvedSubmission = await Submission.findOne({
        userId: payment.userId,
        projectId,
        status: "approved",
      });
      if (!approvedSubmission) {
        console.warn(`Certificate not created: no approved submission for user ${payment.userId} and project ${projectId}`);
        return;
      }
      const existing = await Certificate.findOne({
        userId: payment.userId,
        projectId: projectId,
      });
      if (!existing) {
        await certificatesService.createCertificate({
          userId: payment.userId.toString(),
          projectId: projectId.toString(),
        });
        console.log(`Certificate auto-created for user ${payment.userId} and project ${projectId}`);
      }
    }
  } catch (error) {
    console.error("Failed to automatically create certificate on payment success:", error);
  }
};

const updatePaymentFromPaystackVerification = async (reference, verificationData) => {
  const payment = await getPaymentByReference(reference);

  payment.provider = "paystack";
  payment.status = mapPaystackStatusToPaymentStatus(verificationData.status);
  payment.metadata = {
    ...(payment.metadata || {}),
    paystack: {
      ...getPaystackMetadata(payment),
      verify: {
        status: verificationData.status,
        reference: verificationData.reference,
        amount: verificationData.amount,
        currency: verificationData.currency,
        paid_at: verificationData.paid_at || null,
        channel: verificationData.channel || null,
      },
    },
  };

  await payment.save();

  if (payment.status === "paid") {
    await triggerCertificateCreation(payment);
  }

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

  if (normalizedStatus === "paid") {
    await triggerCertificateCreation(payment);
  }

  return payment;
};

const initializePaystackPayment = async ({ metadata = {}, callbackUrl } = {}, currentUser) => {
  if (!currentUser?.id) throw createHttpError(401, "Authentication required");
  if (!paymentConfig.paystack.secretKey) throw createHttpError(503, "Paystack payments are not configured");

  const purpose = String(metadata?.purpose || "").trim().toLowerCase();
  const projectId = metadata?.projectId;
  if (purpose !== "certificate" || !projectId) {
    throw createHttpError(400, "A certificate projectId is required for payment");
  }
  assertObjectId(projectId, "projectId");

  const Project = require("../../projects/models/projectsModel");
  const project = await Project.findById(projectId).select("_id status approvalStatus");
  if (!project) throw createHttpError(404, "Project not found");
  if (project.approvalStatus !== "approved") throw createHttpError(400, "Project is not approved");

  const Submission = require("../../submissions/models/submissionsModel");
  const approvedSubmission = await Submission.findOne({ userId: currentUser.id, projectId, status: "approved" }).select("_id");
  if (!approvedSubmission) throw createHttpError(400, "You can only purchase a certificate after your submission has been approved");

  const existingCertificate = await require("../../certificates/models/certificatesModel").findOne({ userId: currentUser.id, projectId });
  if (existingCertificate) throw createHttpError(409, "A certificate already exists for this project");

  const expectedAmount = Number(paymentConfig.certificatePrice);
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
    throw createHttpError(500, "CERTIFICATE_PRICE is not configured correctly");
  }

  const existingPending = await Payment.findOne({
    userId: currentUser.id,
    "metadata.purpose": "certificate",
    "metadata.projectId": String(projectId),
    status: "pending",
  }).sort({ createdAt: -1 });
  if (existingPending) {
    return {
      payment: toPaymentResponse(existingPending),
      checkout: getPaystackCheckout(existingPending),
    };
  }

  const reference = createPaymentReference();
  const safeMetadata = {
    purpose: "certificate",
    projectId: String(projectId),
  };
  const currency = paymentConfig.currency.toUpperCase();

  const response = await paystackRequest("/transaction/initialize", {
    method: "POST",
    body: {
      email: currentUser.email,
      amount: Math.round(expectedAmount * 100),
      currency,
      reference,
      callback_url: callbackUrl || paymentConfig.callbackUrl,
      metadata: safeMetadata,
    },
  });

  const createdPayment = await Payment.create({
    userId: currentUser.id,
    amount: expectedAmount,
    currency,
    provider: "paystack",
    status: "pending",
    reference,
    metadata: {
      ...safeMetadata,
      paystack: {
        initialize: {
          authorization_url: response.data.authorization_url,
          access_code: response.data.access_code,
          reference: response.data.reference,
        },
      },
    },
  });

  return { payment: toPaymentResponse(createdPayment), checkout: getPaystackCheckout(createdPayment) };
};

const getPaystackCheckout = (payment) => {
  const initialize = getPaystackMetadata(payment, "initialize");
  return {
    authorizationUrl: initialize.authorization_url,
    accessCode: initialize.access_code,
    reference: payment.reference,
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
  const verified = paystackVerificationResponse.data;
  if (!verified || verified.reference !== existingPayment.reference) {
    throw createHttpError(502, "Paystack returned an invalid payment reference");
  }
  if (String(verified.currency || "").toUpperCase() !== String(existingPayment.currency).toUpperCase()) {
    throw createHttpError(400, "Payment currency does not match the expected currency");
  }
  if (Number(verified.amount) !== Math.round(Number(existingPayment.amount) * 100)) {
    throw createHttpError(400, "Payment amount does not match the expected amount");
  }

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
  const supplied = String(signatureValue).trim().toLowerCase();
  const expectedBuffer = Buffer.from(computedSignature, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");

  if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
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

const processPaymentCallback = async ({ reference, trxref } = {}) => {
  const normalizedReference = String(reference || trxref || "").trim();
  if (!normalizedReference) throw createHttpError(400, "reference is required");
  if ((paymentConfig.provider || "").toLowerCase() !== "paystack") {
    throw createHttpError(503, "Payment callbacks are not available until Paystack is configured");
  }
  return verifyPaystackPayment(normalizedReference);
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
