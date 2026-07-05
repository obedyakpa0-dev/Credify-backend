const AuthenticationUser = require("../../authentication/models/authenticationModel");
const Certificate = require("../../certificates/models/certificatesModel");
const Payment = require("../../payments/models/paymentsModel");

const getDashboardSummary = async () => {
  const [
    totalUsers,
    totalCertificates,
    totalPayments,
    successfulPayments,
  ] = await Promise.all([
    AuthenticationUser.countDocuments(),
    Certificate.countDocuments(),
    Payment.countDocuments(),
    Payment.countDocuments({ status: "paid" }),
  ]);

  return {
    totals: {
      users: totalUsers,
      certificates: totalCertificates,
      payments: totalPayments,
      successfulPayments,
    },
  };
};

module.exports = {
  getDashboardSummary,
};
