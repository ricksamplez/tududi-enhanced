'use strict';

/**
 * Planning Module
 *
 * Provides weekly planning insights based on timetable slots and task durations.
 */

const routes = require('./routes');
const planningService = require('./service');

module.exports = {
    routes,
    planningService,
};
