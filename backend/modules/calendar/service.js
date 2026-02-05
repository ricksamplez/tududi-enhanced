'use strict';

const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { Task } = require('../../models');
const config = require('../../config/config').getConfig();
const {
    getSafeTimezone,
    processDueDateForResponse,
    processDeferUntilForResponse,
} = require('../../utils/timezone-utils');

const DEFAULT_TASK_DURATION_MINUTES = 60;

const escapeIcsText = (value) =>
    String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');

const formatUtcDateTime = (momentDate) =>
    momentDate.utc().format('YYYYMMDDTHHmmss[Z]');

const buildAllDayDates = (date, timezone) => {
    const start = moment.tz(date, 'YYYY-MM-DD', timezone);
    const end = start.clone().add(1, 'day');
    return {
        start: start.format('YYYYMMDD'),
        end: end.format('YYYYMMDD'),
    };
};

const buildTimedDates = (date, minutes, durationMinutes, timezone) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const start = moment
        .tz(date, 'YYYY-MM-DD', timezone)
        .hour(hours)
        .minute(mins)
        .second(0);
    const end = start.clone().add(durationMinutes, 'minutes');
    return {
        start: formatUtcDateTime(start),
        end: formatUtcDateTime(end),
    };
};

class CalendarService {
    async buildIcs(userId, { timezone }) {
        const safeTimezone = getSafeTimezone(timezone);
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
                    { recurring_parent_id: { [Op.ne]: null } },
                ],
            },
            order: [
                ['due_date', 'ASC'],
                ['priority', 'DESC'],
                ['created_at', 'ASC'],
            ],
        });

        const nowStamp = formatUtcDateTime(moment());
        const events = [];

        tasks.forEach((task) => {
            const dueDate = task.due_date
                ? processDueDateForResponse(task.due_date, safeTimezone)
                : null;
            const deferUntil = task.defer_until
                ? processDeferUntilForResponse(task.defer_until, safeTimezone)
                : null;

            if (!dueDate && !deferUntil) {
                return;
            }

            if (dueDate) {
                const duration =
                    task.estimated_duration_minutes &&
                    Number.isFinite(task.estimated_duration_minutes)
                        ? task.estimated_duration_minutes
                        : DEFAULT_TASK_DURATION_MINUTES;

                const uid = `${task.uid}@tududi`;
                const summary = escapeIcsText(task.name);
                const url = `${config.frontendUrl}/task/${task.uid}`;

                if (
                    task.due_time_minutes === null ||
                    task.due_time_minutes === undefined
                ) {
                    const { start, end } = buildAllDayDates(
                        dueDate,
                        safeTimezone
                    );
                    events.push([
                        'BEGIN:VEVENT',
                        `UID:${uid}`,
                        `DTSTAMP:${nowStamp}`,
                        `SUMMARY:${summary}`,
                        `DTSTART;VALUE=DATE:${start}`,
                        `DTEND;VALUE=DATE:${end}`,
                        `URL:${escapeIcsText(url)}`,
                        'END:VEVENT',
                    ]);
                } else {
                    const { start, end } = buildTimedDates(
                        dueDate,
                        task.due_time_minutes,
                        duration,
                        safeTimezone
                    );
                    events.push([
                        'BEGIN:VEVENT',
                        `UID:${uid}`,
                        `DTSTAMP:${nowStamp}`,
                        `SUMMARY:${summary}`,
                        `DTSTART:${start}`,
                        `DTEND:${end}`,
                        `URL:${escapeIcsText(url)}`,
                        'END:VEVENT',
                    ]);
                }
            }

            if (deferUntil) {
                const deferDate = moment
                    .tz(deferUntil, safeTimezone)
                    .format('YYYY-MM-DD');
                const { start, end } = buildAllDayDates(
                    deferDate,
                    safeTimezone
                );
                const uid = `${task.uid}-defer@tududi`;
                const summary = escapeIcsText(`Defer until: ${task.name}`);
                const url = `${config.frontendUrl}/task/${task.uid}`;
                events.push([
                    'BEGIN:VEVENT',
                    `UID:${uid}`,
                    `DTSTAMP:${nowStamp}`,
                    `SUMMARY:${summary}`,
                    `DTSTART;VALUE=DATE:${start}`,
                    `DTEND;VALUE=DATE:${end}`,
                    `URL:${escapeIcsText(url)}`,
                    'END:VEVENT',
                ]);
            }
        });

        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'PRODID:-//Tududi//EN',
            'X-WR-CALNAME:Tududi Tasks',
            ...events.flat(),
            'END:VCALENDAR',
        ];

        return `${lines.join('\r\n')}\r\n`;
    }
}

module.exports = new CalendarService();
