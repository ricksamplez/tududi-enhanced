'use strict';

const scheduleService = require('./service');
const scheduleController = require('./controller');
const scheduleRoutes = require('./routes');

module.exports = {
    scheduleService,
    scheduleController,
    routes: scheduleRoutes,
};
