'use strict';

const express = require('express');
const scheduleController = require('./controller');

const router = express.Router();

router.get('/schedule/week', scheduleController.week);
router.get('/schedule/day', scheduleController.day);
router.patch('/schedule/entries/:id', scheduleController.updateEntry);

module.exports = router;
