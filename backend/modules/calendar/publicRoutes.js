'use strict';

const express = require('express');
const router = express.Router();
const calendarController = require('./controller');

router.get('/calendar/feed/:token.ics', calendarController.publicFeed);

module.exports = router;
