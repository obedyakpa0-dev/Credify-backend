const AuthenticationUser = require("../../authentication/models/authenticationModel");
const Course = require("../../courses/models/coursesModel");
const Badge = require("../../badges/models/badgesModel");
const Certificate = require("../../certificates/models/certificatesModel");
const Payment = require("../../payments/models/paymentsModel");
const LeaderboardEntry = require("../../leaderboard/models/leaderboardModel");

const getDashboardSummary = async () => {
  const [
    totalUsers,
    totalCourses,
    publishedCourses,
    totalBadges,
    totalCertificates,
    totalPayments,
    successfulPayments,
    leaderboardTopThree,
  ] = await Promise.all([
    AuthenticationUser.countDocuments(),
    Course.countDocuments(),
    Course.countDocuments({ isPublished: true }),
    Badge.countDocuments(),
    Certificate.countDocuments(),
    Payment.countDocuments(),
    Payment.countDocuments({ status: "paid" }),
    LeaderboardEntry.find()
      .sort({ points: -1, badgesCount: -1, completedCourses: -1 })
      .limit(3)
      .select("displayName points badgesCount completedCourses"),
  ]);

  return {
    totals: {
      users: totalUsers,
      courses: totalCourses,
      publishedCourses,
      badges: totalBadges,
      certificates: totalCertificates,
      payments: totalPayments,
      successfulPayments,
    },
    leaderboardTopThree,
  };
};

module.exports = {
  getDashboardSummary,
};
