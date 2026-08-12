const express = require("express");
const productionOverviewController = require("../controller/productionOverviewController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/production-overview",
  authenticate,
  productionOverviewController.getProductionOverview,
);

module.exports = router;
