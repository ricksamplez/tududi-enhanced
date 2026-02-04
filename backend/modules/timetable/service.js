'use strict';

const timetableRepository = require('./repository');
const { validateSlotPayload } = require('./validation');
const { NotFoundError } = require('../../shared/errors');

class TimetableService {
    async list(userId, filters = {}) {
        return timetableRepository.findAllByUser(userId, filters);
    }

    async create(userId, payload) {
        validateSlotPayload(payload);
        return timetableRepository.create({
            ...payload,
            user_id: userId,
        });
    }

    async update(userId, id, payload) {
        const slot = await timetableRepository.findByIdAndUser(id, userId);
        if (!slot) {
            throw new NotFoundError('Timetable slot not found.');
        }

        validateSlotPayload({
            weekday: payload.weekday ?? slot.weekday,
            start_minute: payload.start_minute ?? slot.start_minute,
            end_minute: payload.end_minute ?? slot.end_minute,
            slot_type: payload.slot_type ?? slot.slot_type,
        });

        await timetableRepository.update(slot, payload);
        return slot;
    }

    async delete(userId, id) {
        const slot = await timetableRepository.findByIdAndUser(id, userId);
        if (!slot) {
            throw new NotFoundError('Timetable slot not found.');
        }
        await timetableRepository.destroy(slot);
    }
}

module.exports = new TimetableService();
