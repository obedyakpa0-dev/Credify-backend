const certificatesService = require("../services/certificatesService");
const { sendSuccess, sendError } = require("../../../common/http");

const createCertificate = async (req, res) => {
  try {
    const certificate = await certificatesService.createCertificate(req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: "Certificate created successfully",
      data: { certificate },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const listCertificates = async (req, res) => {
  try {
    const query =
      req.user.role === "admin"
        ? req.query
        : { ...req.query, userId: req.user.id };

    const data = await certificatesService.listCertificates(query, req.user);
    return sendSuccess(res, {
      message: "Certificates retrieved successfully",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getCertificateById = async (req, res) => {
  try {
    const certificate = await certificatesService.getCertificateById(
      req.params.certificateId,
      req.user
    );
    return sendSuccess(res, {
      message: "Certificate retrieved successfully",
      data: { certificate },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createCertificate,
  listCertificates,
  getCertificateById,
};
