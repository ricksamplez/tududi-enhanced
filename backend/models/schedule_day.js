const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ScheduleDay = sequelize.define(
        'ScheduleDay',
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
            timezone: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            cutoff_minute: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            dirty: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            dirty_reason: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: 'schedule_days',
            indexes: [
                {
                    unique: true,
                    fields: ['user_id', 'date'],
                },
            ],
        }
    );

    return ScheduleDay;
};
