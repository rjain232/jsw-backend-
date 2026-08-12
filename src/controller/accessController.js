const accessService = require("../services/accessService");
const appConfig = require("../config/appConfig");

const getAvailablePages = async (req, res, next) => {
  try {
    const pages = await accessService.getAllPages();
    return res.json({ pages });
  } catch (error) {
    return next(error);
  }
};

const getUserPages = async (req, res, next) => {
  try {
    const pages = await accessService.getPagesForUser(req.params.userId);
    return res.json({ userId: req.params.userId, pages });
  } catch (error) {
    return next(error);
  }
};

const updateUserPages = async (req, res, next) => {
  try {
    const pages = await accessService.setPagesForUser(req.params.userId, req.body.pageKeys);
    return res.json({ userId: req.params.userId, pages });
  } catch (error) {
    return next(error);
  }
};

const getMyPages = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const role = String(req.user?.role || "").toLowerCase();
    const hasFullAccess = appConfig.roleGroups.fullAccess.includes(role);

    if (!userId) {
      return res.status(400).json({ message: "Token must include a user id" });
    }

    const pages = await accessService.getPagesForUser(userId, hasFullAccess);
    return res.json({ userId, pages });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAvailablePages,
  getUserPages,
  updateUserPages,
  getMyPages,
};
