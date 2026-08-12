const authService = require("../services/authService");
const appConfig = require("../config/appConfig");

const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: appConfig.isProduction,
  maxAge: appConfig.authCookieMaxAgeMs,
  path: "/",
};

const setAuthCookie = (res, token) => {
  res.cookie(appConfig.authCookieName, token, authCookieOptions);
};

const setupSuperAdmin = async (req, res, next) => {
  try {
    const authResult = await authService.setupSuperAdmin(req.body);
    setAuthCookie(res, authResult.token);
    return res.status(201).json({ user: authResult.user });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const authResult = await authService.login(req.body);
    setAuthCookie(res, authResult.token);
    return res.json({ user: authResult.user });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res) => {
  res.clearCookie(appConfig.authCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: appConfig.isProduction,
    path: "/",
  });
  return res.json({ success: true });
};

const me = async (req, res) => {
  return res.json({ user: req.user });
};

module.exports = { setupSuperAdmin, login, logout, me };
