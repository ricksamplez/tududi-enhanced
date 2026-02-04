'use strict';

/**
 * Calendar Module
 *
 * Provides calendar exports (ICS).
 */

const { routes, publicRoutes } = require('./routes');
const calendarService = require('./service');

module.exports = {
    routes,
    publicRoutes,
    calendarService,
};
