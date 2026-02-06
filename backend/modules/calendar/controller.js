'use strict';

const calendarService = require('./service');
const feedTokenService = require('./feedTokenService');
const { UnauthorizedError } = require('../../shared/errors');
const { User, UserCalendarToken } = require('../../models');
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
    async exportScheduleIcs(req, res, next) {
        try {
            requireUserId(req);
            const user = req.currentUser;
            const ics = await calendarService.buildScheduleIcs(user, {
                startDate: req.query.startDate,
            });
            res.set({
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition':
                    'attachment; filename="tududi-schedule.ics"',
            });
            res.send(ics);
        } catch (error) {
            next(error);
        }
    },
    async getFeedToken(req, res, next) {
        try {
            const userId = requireUserId(req);
            const result = await feedTokenService.ensureToken(userId);
            res.json({
                exists: result.exists,
                token: result.token,
                message: result.token
                    ? undefined
                    : 'Rotate to get a new subscription link.',
            });
        } catch (error) {
            next(error);
        }
    },
    async rotateFeedToken(req, res, next) {
        try {
            const userId = requireUserId(req);
            const result = await feedTokenService.rotateToken(userId);
            res.json({ token: result.token });
        } catch (error) {
            next(error);
        }
    },
    async publicFeed(req, res, next) {
        try {
            const token = req.params.token;
            if (!token) {
                res.status(404).send('Not Found');
                return;
            }

            const tokenHash = feedTokenService.hashToken(token);
            const tokenRecord = await UserCalendarToken.findOne({
                where: { token_hash: tokenHash },
                include: [
                    {
                        model: User,
                        as: 'User',
                        attributes: ['id', 'timezone'],
                    },
                ],
            });

            if (!tokenRecord || !tokenRecord.User) {
                res.status(404).send('Not Found');
                return;
            }

            const timezone = tokenRecord.User.timezone;
            const ics = await calendarService.buildIcs(tokenRecord.User.id, {
                timezone,
            });
            res.set({
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'inline; filename="tududi.ics"',
            });
            res.send(ics);
        } catch (error) {
            next(error);
        }
    },
    async publicScheduleFeed(req, res, next) {
        try {
            const token = req.params.token;
            if (!token) {
                res.status(404).send('Not Found');
                return;
            }

            const tokenHash = feedTokenService.hashToken(token);
            const tokenRecord = await UserCalendarToken.findOne({
                where: { token_hash: tokenHash },
                include: [
                    {
                        model: User,
                        as: 'User',
                        attributes: ['id', 'timezone', 'first_day_of_week'],
                    },
                ],
            });

            if (!tokenRecord || !tokenRecord.User) {
                res.status(404).send('Not Found');
                return;
            }

            const ics = await calendarService.buildScheduleIcs(
                tokenRecord.User
            );
            res.set({
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition':
                    'inline; filename="tududi-schedule.ics"',
            });
            res.send(ics);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = calendarController;
