const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TimetableSlot = sequelize.define(
        'TimetableSlot',
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
            weekday: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 0,
                    max: 6,
                },
            },
            start_minute: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 0,
                    max: 1439,
                },
            },
            end_minute: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 1440,
                },
            },
            label: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            area_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'areas',
                    key: 'id',
                },
            },
        },
        {
            tableName: 'timetable_slots',
            indexes: [
                {
                    fields: ['user_id'],
                },
                {
                    fields: ['user_id', 'weekday'],
                },
                {
                    fields: ['user_id', 'weekday', 'start_minute'],
                },
            ],
        }
    );

    return TimetableSlot;
};
