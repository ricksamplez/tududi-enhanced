'use strict';

const express = require('express');
const router = express.Router();
const timetableController = require('./controller');

router.get('/timetable/slots', timetableController.list);
router.post('/timetable/slots', timetableController.create);
router.patch('/timetable/slots/:id', timetableController.update);
router.delete('/timetable/slots/:id', timetableController.delete);

module.exports = router;
