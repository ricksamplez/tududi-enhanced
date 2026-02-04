'use strict';

const { ValidationError } = require('../../shared/errors');

function validateWeekday(weekday) {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        throw new ValidationError('Weekday must be between 0 and 6.');
    }
}

function validateMinutes(value, fieldName) {
    if (!Number.isInteger(value)) {
        throw new ValidationError(`${fieldName} must be a whole number.`);
    }
    if (value < 0 || value > 1440) {
        throw new ValidationError(`${fieldName} must be between 0 and 1440.`);
    }
}

function validateSlotType(slotType) {
    if (!['work', 'pause'].includes(slotType)) {
        throw new ValidationError('Slot type must be work or pause.');
    }
}

function validateSlotPayload(payload) {
    const { weekday, start_minute, end_minute, slot_type } = payload;

    validateWeekday(weekday);
    validateMinutes(start_minute, 'Start minute');
    validateMinutes(end_minute, 'End minute');

    if (end_minute <= start_minute) {
        throw new ValidationError('End minute must be after start minute.');
    }

    validateSlotType(slot_type);
}

module.exports = {
    validateSlotPayload,
};
