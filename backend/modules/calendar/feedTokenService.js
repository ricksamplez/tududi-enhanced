'use strict';

const crypto = require('crypto');
const { UserCalendarToken } = require('../../models');

const generateToken = () => crypto.randomBytes(32).toString('base64url');

const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');

const ensureToken = async (userId) => {
    const existing = await UserCalendarToken.findOne({
        where: { user_id: userId },
    });

    if (existing) {
        return { token: null, created: false, exists: true };
    }

    const token = generateToken();
    const tokenHash = hashToken(token);

    await UserCalendarToken.create({
        user_id: userId,
        token_hash: tokenHash,
    });

    return { token, created: true, exists: true };
};

const rotateToken = async (userId) => {
    const token = generateToken();
    const tokenHash = hashToken(token);

    const [record, created] = await UserCalendarToken.findOrCreate({
        where: { user_id: userId },
        defaults: {
            token_hash: tokenHash,
            rotated_at: new Date(),
        },
    });

    if (!created) {
        record.token_hash = tokenHash;
        record.rotated_at = new Date();
        await record.save();
    }

    return { token };
};

module.exports = {
    generateToken,
    hashToken,
    ensureToken,
    rotateToken,
};
