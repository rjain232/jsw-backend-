const express = require("express");
const authController = require("../controller/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/login", authController.login);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

module.exports = router;
