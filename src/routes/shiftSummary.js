const express = require("express");
const shiftSummaryController = require("../controller/shiftSummaryController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/shift-summary-report",
  authenticate,
  shiftSummaryController.getShiftSummaryReport,
);

module.exports = router;
