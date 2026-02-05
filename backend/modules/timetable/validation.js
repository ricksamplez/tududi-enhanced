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
    if (fieldName === 'Start minute' && (value < 0 || value > 1439)) {
        throw new ValidationError(`${fieldName} must be between 0 and 1439.`);
    }
    if (fieldName === 'End minute' && (value < 1 || value > 1440)) {
        throw new ValidationError(`${fieldName} must be between 1 and 1440.`);
    }
}

function validateSlotPayload(payload) {
    const { weekday, start_minute, end_minute } = payload;

    validateWeekday(weekday);
    validateMinutes(start_minute, 'Start minute');
    validateMinutes(end_minute, 'End minute');

    if (end_minute <= start_minute) {
        throw new ValidationError('End minute must be after start minute.');
    }
}

module.exports = {
    validateSlotPayload,
};
