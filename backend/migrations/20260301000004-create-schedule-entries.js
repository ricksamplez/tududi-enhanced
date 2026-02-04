'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('schedule_entries', {
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
            date: {
                type: Sequelize.DATEONLY,
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
            task_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'tasks',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            slot_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'timetable_slots',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            pinned: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            locked: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
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

        await queryInterface.addIndex('schedule_entries', ['user_id', 'date']);
        await queryInterface.addIndex('schedule_entries', ['task_id']);
        await queryInterface.addIndex('schedule_entries', ['slot_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('schedule_entries');
    },
};
