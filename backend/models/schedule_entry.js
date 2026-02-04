const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ScheduleEntry = sequelize.define(
        'ScheduleEntry',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },
            start_minute: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            end_minute: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            task_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'tasks',
                    key: 'id',
                },
            },
            slot_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'timetable_slots',
                    key: 'id',
                },
            },
            pinned: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            locked: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
        },
        {
            tableName: 'schedule_entries',
            indexes: [
                {
                    fields: ['user_id', 'date'],
                },
                {
                    fields: ['task_id'],
                },
                {
                    fields: ['slot_id'],
                },
            ],
        }
    );

    return ScheduleEntry;
};
