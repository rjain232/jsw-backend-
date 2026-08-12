const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");

const {
  getAnnualGraphData,
} = require("../controller/annualGraphProductionController");

router.get("/annual-graph",authenticate, getAnnualGraphData);

module.exports = router;