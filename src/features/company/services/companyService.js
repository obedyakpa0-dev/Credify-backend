const paymentConfig = require("../../../../config/payment");

let companyProfile = {
  name: "Credify",
  industry: "EdTech",
  supportEmail: "support@credify.local",
  website: "https://credify.local",
  description: "Company profile for the Credify platform.",
  paymentProvider: paymentConfig.provider,
  paymentCurrency: paymentConfig.currency,
};

const getCompanyProfile = async () => companyProfile;

const updateCompanyProfile = async (updates = {}) => {
  const allowedFields = [
    "name",
    "industry",
    "supportEmail",
    "website",
    "description",
    "paymentProvider",
    "paymentCurrency",
  ];

  const updatePayload = allowedFields.reduce((accumulator, key) => {
    if (updates[key] !== undefined) {
      accumulator[key] = updates[key];
    }
    return accumulator;
  }, {});

  companyProfile = {
    ...companyProfile,
    ...updatePayload,
  };

  return companyProfile;
};

module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
};
