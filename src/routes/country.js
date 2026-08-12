const express = require('express');
const countryController = require('../controller/countryController');

const router = express.Router();

router.post('/sync', countryController.syncCountries);

module.exports = router;
