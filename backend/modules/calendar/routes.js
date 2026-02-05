'use strict';

const express = require('express');
const router = express.Router();
const calendarController = require('./controller');

router.get('/calendar/ics', calendarController.exportIcs);
router.get('/calendar/feed-token', calendarController.getFeedToken);
router.post('/calendar/feed-token/rotate', calendarController.rotateFeedToken);

module.exports = router;
