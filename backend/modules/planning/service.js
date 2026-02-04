'use strict';

const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { Task, TimetableSlot } = require('../../models');
const {
    getSafeTimezone,
    processDueDateForResponse,
} = require('../../utils/timezone-utils');

const DEFAULT_TASK_DURATION_MINUTES = 60;

const buildWeekDays = (startDate, timezone) => {
    const days = [];
    for (let i = 0; i < 7; i += 1) {
        const date = startDate.clone().add(i, 'days');
        days.push({
            date: date.format('YYYY-MM-DD'),
            weekday: date.day(),
            capacity_minutes: 0,
            planned_minutes: 0,
            remaining_minutes: 0,
            overload_minutes: 0,
            tasks: [],
        });
    }
    return days;
};

const normalizeDuration = (task) => {
    if (
        task.estimated_duration_minutes &&
        Number.isFinite(task.estimated_duration_minutes)
    ) {
        return task.estimated_duration_minutes;
    }
    return DEFAULT_TASK_DURATION_MINUTES;
};

class PlanningService {
    async getWeekPlan(userId, { startDate, timezone }) {
        const safeTimezone = getSafeTimezone(timezone);
        const startMoment = startDate
            ? moment.tz(startDate, 'YYYY-MM-DD', safeTimezone).startOf('day')
            : moment.tz(safeTimezone).startOf('isoWeek');
        const weekStart = startMoment.clone().startOf('isoWeek');
        const weekEnd = weekStart.clone().add(6, 'days').endOf('day');

        const days = buildWeekDays(weekStart, safeTimezone);
        const weekdays = days.map((day) => day.weekday);

        const timetableSlots = await TimetableSlot.findAll({
            where: {
                user_id: userId,
                weekday: { [Op.in]: weekdays },
            },
        });

        timetableSlots.forEach((slot) => {
            const dayIndex = days.findIndex(
                (day) => day.weekday === slot.weekday
            );
            if (dayIndex === -1) return;
            const duration = Math.max(0, slot.end_minute - slot.start_minute);
            days[dayIndex].capacity_minutes += duration;
        });

        const excludedStatuses = [
            Task.STATUS.DONE,
            Task.STATUS.ARCHIVED,
            Task.STATUS.CANCELLED,
            'done',
            'archived',
            'cancelled',
        ];

        const tasks = await Task.findAll({
            where: {
                user_id: userId,
                status: { [Op.notIn]: excludedStatuses },
                parent_task_id: null,
                [Op.or]: [
                    {
                        [Op.and]: [
                            {
                                [Op.or]: [
                                    { recurrence_type: 'none' },
                                    { recurrence_type: null },
                                ],
                            },
                            { recurring_parent_id: null },
                        ],
                    },
                    {
                        recurring_parent_id: { [Op.ne]: null },
                    },
                ],
            },
            order: [
                ['due_date', 'ASC'],
                ['priority', 'DESC'],
                ['created_at', 'ASC'],
            ],
        });

        const unassignedTasks = [];

        tasks.forEach((task) => {
            const duration = normalizeDuration(task);
            const dueDate = task.due_date
                ? processDueDateForResponse(task.due_date, safeTimezone)
                : null;

            if (!dueDate) {
                unassignedTasks.push({
                    ...task.toJSON(),
                    due_date: null,
                    estimated_duration_minutes: task.estimated_duration_minutes,
                    planned_duration_minutes: duration,
                });
                return;
            }

            const dueMoment = moment.tz(
                dueDate,
                'YYYY-MM-DD',
                safeTimezone
            );

            if (dueMoment.isAfter(weekEnd, 'day')) {
                unassignedTasks.push({
                    ...task.toJSON(),
                    due_date: dueDate,
                    estimated_duration_minutes: task.estimated_duration_minutes,
                    planned_duration_minutes: duration,
                });
                return;
            }

            const targetIndex = Math.max(
                0,
                Math.min(6, dueMoment.diff(weekStart, 'days'))
            );
            const isOverdue = dueMoment.isBefore(weekStart, 'day');
            const day = days[targetIndex];
            day.tasks.push({
                ...task.toJSON(),
                due_date: dueDate,
                estimated_duration_minutes: task.estimated_duration_minutes,
                planned_duration_minutes: duration,
                overdue: isOverdue,
            });
        });

        days.forEach((day) => {
            const plannedMinutes = day.tasks.reduce(
                (total, task) => total + (task.planned_duration_minutes || 0),
                0
            );
            day.planned_minutes = plannedMinutes;
            day.overload_minutes = Math.max(
                0,
                plannedMinutes - day.capacity_minutes
            );
            day.remaining_minutes = Math.max(
                0,
                day.capacity_minutes - plannedMinutes
            );
        });

        const unassigned_minutes = unassignedTasks.reduce(
            (total, task) => total + (task.planned_duration_minutes || 0),
            0
        );

        return {
            start_date: weekStart.format('YYYY-MM-DD'),
            end_date: weekEnd.format('YYYY-MM-DD'),
            timezone: safeTimezone,
            days,
            unassigned_tasks: unassignedTasks,
            unassigned_minutes,
        };
    }
}

module.exports = new PlanningService();
