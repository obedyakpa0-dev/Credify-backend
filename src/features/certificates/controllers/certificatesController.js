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
    // Non-admins can only ever see their own certificates (IDOR prevention)
    const query =
      req.user.role === "admin"
        ? req.query
        : { ...req.query, userId: req.user.id };

    const data = await certificatesService.listCertificates(query);
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
      req.params.certificateId
    );

    // Ensure the student can only fetch their own certificate (IDOR prevention)
    if (
      req.user.role !== "admin" &&
      certificate.userId !== req.user.id
    ) {
      return sendError(res, {
        statusCode: 403,
        message: "You do not have permission to view this certificate",
      });
    }

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
