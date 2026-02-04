'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('timetable_slots', 'area_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'areas',
                key: 'id',
            },
            onDelete: 'SET NULL',
        });

        await queryInterface.createTable('timetable_slot_projects', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            timetable_slot_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'timetable_slots',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            project_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'projects',
                    key: 'id',
                },
                onDelete: 'CASCADE',
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

        await queryInterface.addIndex(
            'timetable_slot_projects',
            ['timetable_slot_id', 'project_id'],
            {
                unique: true,
            }
        );
        await queryInterface.addIndex('timetable_slot_projects', ['project_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('timetable_slot_projects');
        await queryInterface.removeColumn('timetable_slots', 'area_id');
    },
};
