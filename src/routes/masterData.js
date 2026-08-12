const express = require("express");
const masterDataController = require("../controller/masterDataController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, masterDataController.getMasterData);

module.exports = router;
