'use strict';

const reportsService = require('./service');
const { getAuthenticatedUserId } = require('../../utils/request-utils');
const { UnauthorizedError, ValidationError } = require('../../shared/errors');

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

function requireUserId(req) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }
    return userId;
}

const reportsController = {
    async timeReport(req, res, next) {
        try {
            const userId = requireUserId(req);
            const { start, end, group } = req.query;

            if (start && !DATE_FORMAT.test(start)) {
                throw new ValidationError('Invalid start date');
            }
            if (end && !DATE_FORMAT.test(end)) {
                throw new ValidationError('Invalid end date');
            }

            const report = await reportsService.getTimeReport(userId, {
                start,
                end,
                group,
                timezone: req.currentUser?.timezone,
            });

            if (!report) {
                throw new ValidationError('Invalid date range');
            }

            res.json(report);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = reportsController;
