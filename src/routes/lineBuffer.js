const express = require("express");
const lineBufferController = require("../controller/lineBufferController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, lineBufferController.getLineBufferData);

module.exports = router;
