'use strict';

const calendarService = require('./service');
const { UnauthorizedError, NotFoundError } = require('../../shared/errors');
const { getAuthenticatedUserId } = require('../../utils/request-utils');
const { User } = require('../../models');
const { uid } = require('../../utils/uid');
const config = require('../../config/config').getConfig();

function requireUserId(req) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }
    return userId;
}

const buildPublicIcsUrl = (token) =>
    `${config.backendUrl}/api/calendar/ics/public/${token}`;

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

    async exportPublicIcs(req, res, next) {
        try {
            const { token } = req.params;
            const user = await User.findOne({
                where: {
                    public_ics_token: token,
                    public_ics_enabled: true,
                },
                attributes: ['id', 'timezone'],
            });

            if (!user) {
                throw new NotFoundError('Public calendar feed not found');
            }

            const ics = await calendarService.buildIcs(user.id, {
                timezone: user.timezone,
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

    async getPublicIcsInfo(req, res, next) {
        try {
            const userId = requireUserId(req);
            const user = await User.findByPk(userId, {
                attributes: ['public_ics_enabled', 'public_ics_token'],
            });

            if (!user) {
                throw new NotFoundError('Profile not found');
            }

            const enabled = Boolean(user.public_ics_enabled);
            const url =
                enabled && user.public_ics_token
                    ? buildPublicIcsUrl(user.public_ics_token)
                    : null;

            res.json({ enabled, url });
        } catch (error) {
            next(error);
        }
    },

    async enablePublicIcs(req, res, next) {
        try {
            const userId = requireUserId(req);
            const user = await User.findByPk(userId, {
                attributes: ['id', 'public_ics_enabled', 'public_ics_token'],
            });

            if (!user) {
                throw new NotFoundError('Profile not found');
            }

            if (!user.public_ics_token) {
                user.public_ics_token = uid();
            }
            user.public_ics_enabled = true;
            await user.save();

            res.json({
                enabled: true,
                url: buildPublicIcsUrl(user.public_ics_token),
            });
        } catch (error) {
            next(error);
        }
    },

    async rotatePublicIcs(req, res, next) {
        try {
            const userId = requireUserId(req);
            const user = await User.findByPk(userId, {
                attributes: ['id', 'public_ics_token'],
            });

            if (!user) {
                throw new NotFoundError('Profile not found');
            }

            user.public_ics_token = uid();
            user.public_ics_enabled = true;
            await user.save();

            res.json({
                enabled: true,
                url: buildPublicIcsUrl(user.public_ics_token),
            });
        } catch (error) {
            next(error);
        }
    },

    async disablePublicIcs(req, res, next) {
        try {
            const userId = requireUserId(req);
            const user = await User.findByPk(userId, {
                attributes: ['id', 'public_ics_enabled', 'public_ics_token'],
            });

            if (!user) {
                throw new NotFoundError('Profile not found');
            }

            user.public_ics_enabled = false;
            user.public_ics_token = null;
            await user.save();

            res.json({ enabled: false, url: null });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = calendarController;
