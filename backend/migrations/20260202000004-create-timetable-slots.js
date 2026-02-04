'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('timetable_slots', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            weekday: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            start_minute: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            end_minute: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            slot_type: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            label: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        await queryInterface.addIndex('timetable_slots', ['user_id']);
        await queryInterface.addIndex('timetable_slots', [
            'user_id',
            'weekday',
        ]);
        await queryInterface.addIndex('timetable_slots', [
            'user_id',
            'weekday',
            'start_minute',
        ]);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('timetable_slots');
    },
};
