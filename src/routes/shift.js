const express = require('express');
const router = express.Router();
const shiftController = require('../controller/shiftController');

// Define the routes for shift management

// GET /api/shifts
router.get('/', shiftController.getShiftData);

// PUT /api/shifts/:hourId
router.put('/:hourId', shiftController.updateShiftData);

module.exports = router;