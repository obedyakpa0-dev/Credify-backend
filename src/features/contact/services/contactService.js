const ContactMessage = require("../models/contactMessageModel");
const { createHttpError } = require("../../../common/http");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createContactMessage = async ({ name, email, subject, message } = {}) => {
  if (!name || !email || !message) {
    throw createHttpError(400, "name, email and message are required");
  }

  if (!EMAIL_REGEX.test(String(email).trim())) {
    throw createHttpError(400, "Invalid email address format");
  }

  const contactMessage = await ContactMessage.create({ name, email, subject, message });
  return { id: contactMessage._id.toString(), createdAt: contactMessage.createdAt };
};

module.exports = { createContactMessage };
