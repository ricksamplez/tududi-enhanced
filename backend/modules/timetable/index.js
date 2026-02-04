'use strict';

/**
 * Timetable Module
 *
 * Manages weekly timetable slots for planning.
 */

const routes = require('./routes');
const timetableService = require('./service');
const timetableRepository = require('./repository');

module.exports = {
    routes,
    timetableService,
    timetableRepository,
};
