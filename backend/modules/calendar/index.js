'use strict';

/**
 * Calendar Module
 *
 * Provides calendar exports (ICS).
 */

const routes = require('./routes');
const calendarService = require('./service');

module.exports = {
    routes,
    calendarService,
};
