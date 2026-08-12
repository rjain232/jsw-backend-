const express = require("express");
const hourlyProductionController = require("../controller/hourlyProductionController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/hourly-report",
  authenticate,
  hourlyProductionController.getHourlyProductionReport,
);

router.patch(
  "/update-remark",
   authenticate,
  hourlyProductionController.updateHourlyProductionRemark,
);

module.exports = router;
