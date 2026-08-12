const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getReport,
  getLossTypes,
} = require("../controller/lossesAnalysisController");

router.get("/loss-types", authenticate, getLossTypes);
router.get("/report", authenticate, getReport);

module.exports = router;
