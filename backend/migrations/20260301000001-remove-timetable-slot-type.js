'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkDelete('timetable_slots', {
            slot_type: 'pause',
        });
        await queryInterface.removeColumn('timetable_slots', 'slot_type');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn('timetable_slots', 'slot_type', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'work',
        });
    },
};
