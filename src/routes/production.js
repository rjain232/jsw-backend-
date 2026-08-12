const express = require("express");
const productionController = require("../controller/productionController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/transactions", authenticate, productionController.getProductionTransactions);
router.get("/production-summary" , productionController.getProductionSummary );

module.exports = router;
