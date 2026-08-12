const express = require("express");
const accessController = require("../controller/accessController");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/me/pages", authenticate, accessController.getMyPages);
router.get("/pages", authenticate, requireAdmin, accessController.getAvailablePages);
router.get("/users/:userId/pages", authenticate, requireAdmin, accessController.getUserPages);
router.put("/users/:userId/pages", authenticate, requireAdmin, accessController.updateUserPages);

module.exports = router;
