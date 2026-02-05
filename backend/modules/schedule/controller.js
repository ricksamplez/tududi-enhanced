'use strict';

const scheduleService = require('./service');
const { getAuthenticatedUserId } = require('../../utils/request-utils');
const { UnauthorizedError } = require('../../shared/errors');

function requireUserId(req) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }
    return userId;
}

const scheduleController = {
    async week(req, res, next) {
        try {
            const userId = requireUserId(req);
            const startDate = req.query.start;
            const timezone = req.currentUser?.timezone;
            const firstDayOfWeek = req.currentUser?.first_day_of_week ?? 1;
            const result = await scheduleService.getWeekSchedule(userId, {
                startDate,
                timezone,
                firstDayOfWeek,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    },
    async day(req, res, next) {
        try {
            const userId = requireUserId(req);
            const date = req.query.date;
            const timezone = req.currentUser?.timezone;
            const result = await scheduleService.getDaySchedule(userId, {
                date,
                timezone,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    },
    async updateEntry(req, res, next) {
        try {
            const userId = requireUserId(req);
            const timezone = req.currentUser?.timezone;
            const entryId = Number(req.params.id);
            const { pinned, locked } = req.body || {};
            const result = await scheduleService.updateEntryFlags(userId, entryId, {
                pinned,
                locked,
                timezone,
            });
            res.json(result);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = scheduleController;
