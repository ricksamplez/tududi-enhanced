'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'public_ics_token', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        await queryInterface.addColumn('users', 'public_ics_enabled', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });

        await queryInterface.addIndex('users', ['public_ics_token'], {
            name: 'users_public_ics_token_idx',
            unique: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('users', 'users_public_ics_token_idx');
        await queryInterface.removeColumn('users', 'public_ics_enabled');
        await queryInterface.removeColumn('users', 'public_ics_token');
    },
};
