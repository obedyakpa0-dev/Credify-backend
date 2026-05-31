const AuthenticationUser = require("../../authentication/models/authenticationModel");
const Course = require("../../courses/models/coursesModel");
const Payment = require("../../payments/models/paymentsModel");
const Certificate = require("../../certificates/models/certificatesModel");
const LeaderboardEntry = require("../../leaderboard/models/leaderboardModel");

const getAdminOverview = async () => {
  const [
    totalUsers,
    totalCourses,
    publishedCourses,
    totalPayments,
    paidPayments,
    totalCertificates,
    totalLeaderboardEntries,
    recentUsers,
    recentPayments,
  ] = await Promise.all([
    AuthenticationUser.countDocuments(),
    Course.countDocuments(),
    Course.countDocuments({ isPublished: true }),
    Payment.countDocuments(),
    Payment.countDocuments({ status: "paid" }),
    Certificate.countDocuments(),
    LeaderboardEntry.countDocuments(),
    AuthenticationUser.find().sort({ createdAt: -1 }).limit(5).select("firstName lastName email"),
    Payment.find().sort({ createdAt: -1 }).limit(5).select("amount currency status reference"),
  ]);

  return {
    totals: {
      users: totalUsers,
      courses: totalCourses,
      totalpublishedCourses: publishedCourses,
      payments: totalPayments,
      totalpaidPayments: paidPayments,
      certificates: totalCertificates,
      leaderboardEntries: totalLeaderboardEntries,
    },
    recentUsers,
    recentPayments,
  };
};

module.exports = {
  getAdminOverview,
};
