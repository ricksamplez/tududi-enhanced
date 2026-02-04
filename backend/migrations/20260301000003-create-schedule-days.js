'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('schedule_days', {
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
            timezone: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            cutoff_minute: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            dirty: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            dirty_reason: {
                type: Sequelize.TEXT,
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

        await queryInterface.addIndex('schedule_days', ['user_id', 'date'], {
            unique: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('schedule_days');
    },
};
