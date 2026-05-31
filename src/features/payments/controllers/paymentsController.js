const paymentsService = require("../services/paymentsService");
const { createHttpError, sendSuccess, sendError } = require("../../../common/http");

const initializePaystackPayment = async (req, res) => {
  try {
    const data = await paymentsService.initializePaystackPayment(req.body, req.user);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Paystack payment initialized successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const verifyPaystackPayment = async (req, res) => {
  try {
    const data = await paymentsService.verifyPaystackPayment(
      req.params.reference,
      req.user
    );
    return sendSuccess(res, {
      message: "Paystack payment verified successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const paystackWebhook = async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      throw createHttpError(400, "Webhook endpoint expects a raw request body");
    }

    const data = await paymentsService.processPaystackWebhook({
      rawPayload: req.body,
      signature: req.headers["x-paystack-signature"],
    });

    return sendSuccess(res, {
      message: "Paystack webhook processed successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const createPayment = async (req, res) => {
  try {
    const payment = await paymentsService.createPayment(req.body, req.user);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Payment initialized successfully",
      data: { payment },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const listPayments = async (req, res) => {
  try {
    const data = await paymentsService.listPayments(req.query, req.user);
    return sendSuccess(res, {
      message: "Payments retrieved successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const payment = await paymentsService.updatePaymentStatus(
      req.params.paymentId,
      req.body.status,
      req.user
    );
    return sendSuccess(res, {
      message: "Payment status updated successfully",
      data: { payment },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const paymentCallback = async (req, res) => {
  try {
    const callbackPayload = {
      ...(req.method === "GET" ? req.query : req.body),
      ...(req.method === "GET" ? req.body : req.query),
    };

    const payment = await paymentsService.processPaymentCallback(callbackPayload);
    return sendSuccess(res, {
      message: "Payment callback processed successfully",
      data: { payment },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  initializePaystackPayment,
  verifyPaystackPayment,
  paystackWebhook,
  createPayment,
  listPayments,
  updatePaymentStatus,
  paymentCallback,
};
