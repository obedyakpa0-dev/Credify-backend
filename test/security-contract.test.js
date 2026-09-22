const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("public registration cannot include admin", () => {
  const source = read("src/features/authentication/services/authenticationService.js");
  assert.match(source, /const VALID_REGISTRATION_ROLES = \["student", "graduate", "company"\]/);
  assert.doesNotMatch(source, /VALID_REGISTRATION_ROLES = \[[^\]]*"admin"/);
});

test("production requires explicit CORS and strong JWT secret", () => {
  const source = read("config/environment.js");
  assert.match(source, /jwtSecret\.length < 32/);
  assert.match(source, /corsOrigin === "\*"/);
});

test("cookie-authenticated mutations require CSRF and trusted origin", () => {
  const source = read("src/app.js");
  assert.match(source, /app\.use\(requireTrustedOrigin\)/);
  assert.match(source, /app\.use\(requireCsrf\)/);
});

test("leaderboard metrics are not accepted from the public upsert service", () => {
  const source = read("src/features/leaderboard/services/leaderboardService.js");
  assert.match(source, /const upsertEntry = async \(\{ userId, displayName \} = \{\}\)/);
  assert.doesNotMatch(source, /points, badgesCount, completedCourses/);
});

test("certificates are unique per user and project", () => {
  const source = read("src/features/certificates/models/certificatesModel.js");
  assert.match(source, /certificatesSchema\.index\(\{ userId: 1, projectId: 1 \}, \{ unique: true \}\)/);
});
