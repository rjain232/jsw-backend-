const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getVariants,
  getReport,
  getOverview,
} = require("../controller/cycleTimeController");

router.get("/variants", authenticate, getVariants);
router.get("/report", authenticate, getReport);
router.get("/overview", authenticate, getOverview);

module.exports = router;
