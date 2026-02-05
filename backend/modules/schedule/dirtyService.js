'use strict';

const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { ScheduleDay, ScheduleEntry } = require('../../models');
const {
    getSafeTimezone,
    processDueDateForResponse,
} = require('../../utils/timezone-utils');

const isDoneStatus = (status) =>
    status === 'done' || status === 2 || status === 'completed';

const getWeekEnd = (today, firstDayOfWeek) => {
    const weekday = today.day();
    const diff = (weekday - firstDayOfWeek + 7) % 7;
    const weekStart = today.clone().subtract(diff, 'days');
    return weekStart.clone().add(6, 'days');
};

const normalizeDate = (dateValue, timezone) => {
    if (!dateValue) return null;
    return processDueDateForResponse(dateValue, timezone);
};

const isInHorizon = (dateString, today, weekEnd) => {
    if (!dateString) return false;
    const dateMoment = moment.tz(dateString, 'YYYY-MM-DD', today.tz());
    return (
        dateMoment.isSameOrAfter(today, 'day') &&
        dateMoment.isSameOrBefore(weekEnd, 'day')
    );
};

const markDayDirty = async (userId, dateString, timezone, reason = null) => {
    if (!dateString) return;
    const [day] = await ScheduleDay.findOrCreate({
        where: { user_id: userId, date: dateString },
        defaults: { timezone, dirty: true, dirty_reason: reason },
    });
    if (!day.dirty || reason) {
        await day.update({
            dirty: true,
            dirty_reason: reason || day.dirty_reason,
        });
    }
};

const isEligibleForScheduling = (task) =>
    Boolean(
        task.due_date &&
            task.due_time_minutes !== null &&
            task.due_time_minutes !== undefined &&
            task.estimated_duration_minutes !== null &&
            task.estimated_duration_minutes !== undefined
    );

const markTaskCreated = async ({ userId, task, timezone, firstDayOfWeek }) => {
    if (!isEligibleForScheduling(task)) return;
    const safeTimezone = getSafeTimezone(timezone);
    const today = moment.tz(safeTimezone).startOf('day');
    const weekEnd = getWeekEnd(today, Number(firstDayOfWeek) || 0);
    const dueDate = normalizeDate(task.due_date, safeTimezone);
    if (isInHorizon(dueDate, today, weekEnd)) {
        await markDayDirty(userId, dueDate, safeTimezone, 'task_created');
    }
};

const markTaskUpdated = async ({
    userId,
    oldValues,
    task,
    timezone,
    firstDayOfWeek,
}) => {
    const safeTimezone = getSafeTimezone(timezone);
    const today = moment.tz(safeTimezone).startOf('day');
    const weekEnd = getWeekEnd(today, Number(firstDayOfWeek) || 0);
    const oldDueDate = normalizeDate(oldValues.due_date, safeTimezone);
    const newDueDate = normalizeDate(task.due_date, safeTimezone);
    const dueDateChanged = oldDueDate !== newDueDate;

    if (dueDateChanged) {
        if (isInHorizon(oldDueDate, today, weekEnd)) {
            await markDayDirty(
                userId,
                oldDueDate,
                safeTimezone,
                'due_date_changed'
            );
        }
        if (isInHorizon(newDueDate, today, weekEnd)) {
            await markDayDirty(
                userId,
                newDueDate,
                safeTimezone,
                'due_date_changed'
            );
        }
        return;
    }

    const dueTimeChanged = oldValues.due_time_minutes !== task.due_time_minutes;
    const durationChanged =
        oldValues.estimated_duration_minutes !==
        task.estimated_duration_minutes;
    const projectChanged = oldValues.project_id !== task.project_id;

    if ((dueTimeChanged || durationChanged || projectChanged) && newDueDate) {
        if (isInHorizon(newDueDate, today, weekEnd)) {
            await markDayDirty(
                userId,
                newDueDate,
                safeTimezone,
                'task_updated'
            );
        }
    }
};

const markTaskCompleted = async ({
    userId,
    taskId,
    timezone,
    firstDayOfWeek,
}) => {
    const safeTimezone = getSafeTimezone(timezone);
    const today = moment.tz(safeTimezone).startOf('day');
    const weekEnd = getWeekEnd(today, Number(firstDayOfWeek) || 0);
    const cutoffMinute = today
        ? moment.tz(safeTimezone).hour() * 60 + moment.tz(safeTimezone).minute()
        : null;

    const entries = await ScheduleEntry.findAll({
        where: {
            user_id: userId,
            task_id: taskId,
            date: {
                [Op.gte]: today.format('YYYY-MM-DD'),
                [Op.lte]: weekEnd.format('YYYY-MM-DD'),
            },
        },
    });

    const dirtyDates = new Set();
    entries.forEach((entry) => {
        if (entry.date === today.format('YYYY-MM-DD')) {
            if (entry.start_minute > cutoffMinute) {
                dirtyDates.add(entry.date);
            }
        } else {
            dirtyDates.add(entry.date);
        }
    });

    await Promise.all(
        Array.from(dirtyDates).map((dateString) =>
            markDayDirty(userId, dateString, safeTimezone, 'task_completed')
        )
    );
};

module.exports = {
    isDoneStatus,
    markTaskCreated,
    markTaskUpdated,
    markTaskCompleted,
};
