'use strict';

const calendarService = require('./service');
const { UnauthorizedError } = require('../../shared/errors');
const { getAuthenticatedUserId } = require('../../utils/request-utils');

function requireUserId(req) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }
    return userId;
}

const calendarController = {
    async exportIcs(req, res, next) {
        try {
            const userId = requireUserId(req);
            const timezone = req.currentUser?.timezone;
            const ics = await calendarService.buildIcs(userId, { timezone });
            res.set({
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="tududi.ics"',
            });
            res.send(ics);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = calendarController;
