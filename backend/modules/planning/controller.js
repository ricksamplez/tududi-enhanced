'use strict';

const planningService = require('./service');
const { getAuthenticatedUserId } = require('../../utils/request-utils');
const { UnauthorizedError } = require('../../shared/errors');

function requireUserId(req) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }
    return userId;
}

const planningController = {
    async weekPlan(req, res, next) {
        try {
            const userId = requireUserId(req);
            const startDate = req.query.start;
            const timezone = req.currentUser?.timezone;
            const result = await planningService.getWeekPlan(userId, {
                startDate,
                timezone,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = planningController;
