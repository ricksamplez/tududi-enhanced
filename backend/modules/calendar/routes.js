'use strict';

const express = require('express');
const router = express.Router();
const calendarController = require('./controller');

router.get('/calendar/ics', calendarController.exportIcs);

module.exports = router;
