const jwt = require("jsonwebtoken");
const appConfig = require("../config/appConfig");

const parseCookies = (cookieHeader = "") => {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex <= 0) {
        return acc;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

const getTokenFromHeader = (authorization = "") => {
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const getTokenFromCookie = (cookieHeader = "") => {
  const cookies = parseCookies(cookieHeader);
  return cookies[appConfig.authCookieName] || null;
};

const authenticate = (req, res, next) => {
  const token =
    getTokenFromHeader(req.headers.authorization) ||
    getTokenFromCookie(req.headers.cookie);

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required" });
  }

  try {
    req.user = jwt.verify(token, appConfig.jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireAdmin = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();

  if (!appConfig.roleGroups.adminAccess.includes(role)) {
    return res.status(403).json({ message: "Admin access is required" });
  }

  return next();
};

const requireSuperAdmin = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();

  if (!appConfig.roleGroups.superAdminAccess.includes(role)) {
    return res.status(403).json({ message: "Superadmin access is required" });
  }

  return next();
};

module.exports = { authenticate, requireAdmin, requireSuperAdmin };
