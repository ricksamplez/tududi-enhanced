'use strict';

const express = require('express');
const router = express.Router();
const calendarController = require('./controller');

router.get('/calendar/feed/:token.ics', calendarController.publicFeed);
router.get(
    '/calendar/feed/:token/schedule.ics',
    calendarController.publicScheduleFeed
);

module.exports = router;
