const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getRobotStatusReport } = require("../controller/robotStatusController");

router.get("/report", authenticate, getRobotStatusReport);

module.exports = router;
