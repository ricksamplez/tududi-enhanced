'use strict';

const { TimetableSlot } = require('../../models');
const BaseRepository = require('../../shared/database/BaseRepository');

class TimetableRepository extends BaseRepository {
    constructor() {
        super(TimetableSlot);
    }

    async findAllByUser(userId, { weekday } = {}) {
        const where = { user_id: userId };
        if (weekday !== undefined) {
            where.weekday = weekday;
        }
        return this.model.findAll({
            where,
            order: [
                ['weekday', 'ASC'],
                ['start_minute', 'ASC'],
            ],
        });
    }

    async findByIdAndUser(id, userId) {
        return this.model.findOne({
            where: {
                id,
                user_id: userId,
            },
        });
    }
}

module.exports = new TimetableRepository();
