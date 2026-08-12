const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getRobotSpotHitRate,
} = require("../controller/robotSpotHitRateController");

router.get("/report", authenticate, getRobotSpotHitRate);

module.exports = router;
