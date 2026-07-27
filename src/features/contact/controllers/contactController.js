const contactService = require("../services/contactService");
const { sendSuccess, sendError } = require("../../../common/http");

const createContactMessage = async (req, res) => {
  try {
    const message = await contactService.createContactMessage(req.body);
    return sendSuccess(res, { statusCode: 201, message: "Message received", data: { message } });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = { createContactMessage };
