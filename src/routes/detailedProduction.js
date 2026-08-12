const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getDetailedProductionData,
} = require("../controller/detailedProductionController");

router.get("/detailed-production", authenticate, getDetailedProductionData);

module.exports = router;
