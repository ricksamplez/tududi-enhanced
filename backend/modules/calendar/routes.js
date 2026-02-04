'use strict';

const express = require('express');
const router = express.Router();
const publicRouter = express.Router();
const calendarController = require('./controller');

publicRouter.get('/calendar/ics/public/:token', calendarController.exportPublicIcs);

router.get('/calendar/ics', calendarController.exportIcs);
router.get('/calendar/ics/public', calendarController.getPublicIcsInfo);
router.post('/calendar/ics/public', calendarController.enablePublicIcs);
router.post('/calendar/ics/public/rotate', calendarController.rotatePublicIcs);
router.delete('/calendar/ics/public', calendarController.disablePublicIcs);

module.exports = { routes: router, publicRoutes: publicRouter };
