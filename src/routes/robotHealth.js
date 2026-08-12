const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getRobotHealthStatus } = require("../controller/robotHealthController");

router.get("/status", authenticate, getRobotHealthStatus);

module.exports = router;
