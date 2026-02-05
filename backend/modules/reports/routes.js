'use strict';

const express = require('express');
const router = express.Router();
const reportsController = require('./controller');

router.get('/reports/time', reportsController.timeReport);

module.exports = router;
