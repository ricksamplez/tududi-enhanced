'use strict';

const timetableService = require('./service');
const { UnauthorizedError } = require('../../shared/errors');
const { getAuthenticatedUserId } = require('../../utils/request-utils');

function requireUserId(req) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        throw new UnauthorizedError('Authentication required');
    }
    return userId;
}

const timetableController = {
    async list(req, res, next) {
        try {
            const userId = requireUserId(req);
            const weekday =
                req.query.weekday !== undefined
                    ? Number(req.query.weekday)
                    : undefined;
            const slots = await timetableService.list(userId, { weekday });
            res.json(slots);
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const userId = requireUserId(req);
            const slot = await timetableService.create(userId, req.body);
            res.status(201).json(slot);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const userId = requireUserId(req);
            const slotId = Number(req.params.id);
            const slot = await timetableService.update(
                userId,
                slotId,
                req.body
            );
            res.json(slot);
        } catch (error) {
            next(error);
        }
    },

    async delete(req, res, next) {
        try {
            const userId = requireUserId(req);
            const slotId = Number(req.params.id);
            await timetableService.delete(userId, slotId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    },
};

module.exports = timetableController;
