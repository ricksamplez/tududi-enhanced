'use strict';

/**
 * Calendar Module
 *
 * Provides calendar exports (ICS).
 */

const routes = require('./routes');
const publicRoutes = require('./publicRoutes');
const calendarService = require('./service');

module.exports = {
    routes,
    publicRoutes,
    calendarService,
};
