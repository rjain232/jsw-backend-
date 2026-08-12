const express = require("express");
const { authenticate } = require("../middleware/auth");
const tipChangeCountController = require("../controller/tipChangeCountController");

const router = express.Router();

router.get(
  "/tip-change-count",
  authenticate,
  tipChangeCountController.getTipChangeCount,
);

module.exports = router;
