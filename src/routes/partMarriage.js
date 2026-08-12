
const express = require("express");
const { authenticate } = require("../middleware/auth");
const partMarriageController = require("../controller/partMarriageController");
 
const router = express.Router();
 
router.get(
  "/",
  authenticate,
  partMarriageController.getPartMarriage,
);
 
module.exports = router;