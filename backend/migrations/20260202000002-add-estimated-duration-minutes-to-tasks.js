'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn(
            'tasks',
            'estimated_duration_minutes',
            {
                type: Sequelize.INTEGER,
                allowNull: true,
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.removeColumn(
            'tasks',
            'estimated_duration_minutes'
        );
    },
};
