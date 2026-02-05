const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserCalendarToken = sequelize.define(
        'UserCalendarToken',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                unique: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            token_hash: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            rotated_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'user_calendar_tokens',
            indexes: [
                {
                    fields: ['user_id'],
                },
                {
                    fields: ['token_hash'],
                },
            ],
        }
    );

    return UserCalendarToken;
};
