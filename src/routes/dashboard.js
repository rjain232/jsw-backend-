const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getDashboardData,
} = require("../controller/dashboardController");

router.get("/dashboard-data", authenticate, getDashboardData);

module.exports = router;
