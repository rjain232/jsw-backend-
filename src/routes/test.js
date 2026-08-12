const express = require('express');
const router = express.Router();
const testController = require('../controller/testController');

router.get('/run-pipeline', testController.runPipeline);

module.exports = router;
