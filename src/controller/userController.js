const authService = require("../services/authService");

const getUsers = async (req, res, next) => {
  try {
    const users = await authService.getUsers();
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const result = await authService.createUser(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const result = await authService.updateUser(req.params.userId, req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await authService.deleteUser(req.params.userId);
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
