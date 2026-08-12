const express = require("express");
const userController = require("../controller/userController");
const { authenticate, requireAdmin, requireSuperAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, requireAdmin, userController.getUsers);
router.post("/", authenticate, requireSuperAdmin, userController.createUser);
router.patch("/:userId", authenticate, requireSuperAdmin, userController.updateUser);
router.delete("/:userId", authenticate, requireSuperAdmin, userController.deleteUser);

module.exports = router;
