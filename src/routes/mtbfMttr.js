const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getReport } = require("../controller/mtbfMttrController");

router.get("/report", authenticate, getReport);

module.exports = router;
