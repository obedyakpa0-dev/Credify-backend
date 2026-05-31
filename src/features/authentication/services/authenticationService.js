const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const environment = require("../../../../config/environment");
const AuthenticationUser = require("../models/authenticationModel");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const sanitizeUser = (userDocument) => ({
  id: userDocument._id.toString(),
  firstName: userDocument.firstName,
  lastName: userDocument.lastName,
  email: userDocument.email,
  role: userDocument.role,
  createdAt: userDocument.createdAt,
  updatedAt: userDocument.updatedAt,
});

const createAccessToken = (userDocument) =>
  jwt.sign(
    {
      sub: userDocument._id.toString(),
      email: userDocument.email,
      role: userDocument.role,
    },
    environment.jwtSecret,
    { expiresIn: environment.jwtExpiresIn }
  );

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    throw createHttpError(401, "Authorization header is required");
  }

  const [scheme, token] = authorizationHeader.trim().split(" ");

  if (scheme !== "Bearer" || !token) {
    throw createHttpError(401, "Authorization header must be a Bearer token");
  }

  return token;
};

const registerUser = async ({ firstName, lastName, email, password } = {}) => {
  if (!firstName || !lastName || !email || !password) {
    throw createHttpError(400, "firstName, lastName, email, and password are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await AuthenticationUser.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw createHttpError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, environment.bcryptSaltRounds);

  const createdUser = await AuthenticationUser.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    password: passwordHash,
  });

  const accessToken = createAccessToken(createdUser);

  return {
    accessToken,
    user: sanitizeUser(createdUser),
  };
};

const loginUser = async ({ email, password } = {}) => {
  if (!email || !password) {
    throw createHttpError(400, "email and password are required");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const foundUser = await AuthenticationUser.findOne({ email: normalizedEmail }).select(
    "+password"
  );

  if (!foundUser) {
    throw createHttpError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, foundUser.password);

  if (!isPasswordValid) {
    throw createHttpError(401, "Invalid email or password");
  }

  const accessToken = createAccessToken(foundUser);

  return {
    accessToken,
    user: sanitizeUser(foundUser),
  };
};

const getAuthenticatedUser = async (authorizationHeader) => {
  const token = extractBearerToken(authorizationHeader);

  let payload;
  try {
    payload = jwt.verify(token, environment.jwtSecret);
  } catch (_error) {
    throw createHttpError(401, "Invalid or expired token");
  }

  const user = await AuthenticationUser.findById(payload.sub);

  if (!user) {
    throw createHttpError(401, "User does not exist");
  }

  return sanitizeUser(user);
};

module.exports = {
  registerUser,
  loginUser,
  getAuthenticatedUser,
};
