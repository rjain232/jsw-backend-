const express = require("express");
const authController = require("../controller/authController");

const router = express.Router();

router.post("/superadmin", authController.setupSuperAdmin);

module.exports = router;
