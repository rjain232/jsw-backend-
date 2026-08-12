const express = require("express");
const lineVariantController = require("../controller/lineVariantController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/line-variant",
  authenticate,
  lineVariantController.getLineAndVariantData
);

module.exports = router;