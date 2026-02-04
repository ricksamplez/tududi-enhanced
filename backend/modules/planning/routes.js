'use strict';

const express = require('express');
const router = express.Router();
const planningController = require('./controller');

router.get('/planning/week', planningController.weekPlan);

module.exports = router;
