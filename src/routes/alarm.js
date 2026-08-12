const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  getAlarmReportData,
  getAlarmCategories,
  getTopXAlarmsData,
} = require("../controller/alarmController");

router.get("/categories", authenticate, getAlarmCategories);
router.get("/alarm-report", authenticate, getAlarmReportData);
router.get("/top-alarms", authenticate, getTopXAlarmsData);

module.exports = router;
