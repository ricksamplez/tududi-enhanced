'use strict';

const { ValidationError } = require('../../shared/errors');
const { isValidUid } = require('../../utils/slug-utils');

/**
 * Validates area name.
 * @param {string} name - The name to validate
 * @returns {string} - The sanitized name
 * @throws {ValidationError} - If validation fails
 */
function validateName(name) {
    if (!name || typeof name !== 'string') {
        throw new ValidationError('Area name is required.');
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
        throw new ValidationError('Area name is required.');
    }

    return trimmed;
}

/**
 * Validates a UID parameter.
 * @param {string} uid - The UID to validate
 * @throws {ValidationError} - If validation fails
 */
function validateUid(uid) {
    if (!isValidUid(uid)) {
        throw new ValidationError('Invalid UID');
    }
}

function validateColor(color) {
    if (color === undefined || color === null || color === '') {
        return null;
    }

    if (typeof color !== 'string') {
        throw new ValidationError('Color must be a string.');
    }

    const normalized = color.trim();

    if (!/^#([0-9a-fA-F]{6})$/.test(normalized)) {
        throw new ValidationError('Color must be a hex value like #RRGGBB.');
    }

    return normalized;
}

module.exports = {
    validateName,
    validateUid,
    validateColor,
};
