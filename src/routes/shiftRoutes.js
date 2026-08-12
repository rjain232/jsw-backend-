const express = require('express');
const router = express.Router();
const shiftController = require('../controller/shiftController');

router.get('/', shiftController.getShiftData);
router.put('/:hourId', shiftController.updateShiftData);

module.exports = router;
