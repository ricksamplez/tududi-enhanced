'use strict';

const moment = require('moment-timezone');
const { Op } = require('sequelize');
const {
    Task,
    TimetableSlot,
    ScheduleDay,
    ScheduleEntry,
    Project,
    Area,
} = require('../../models');
const {
    getSafeTimezone,
    processDueDateForResponse,
    processDeferUntilForResponse,
} = require('../../utils/timezone-utils');
const { NotFoundError, ValidationError } = require('../../shared/errors');

const EXCLUDED_STATUSES = [
    Task.STATUS.DONE,
    Task.STATUS.ARCHIVED,
    Task.STATUS.CANCELLED,
    'done',
    'archived',
    'cancelled',
];

const SQLITE_BUSY_ERRORS = new Set(['SQLITE_BUSY', 'SQLITE_BUSY_TIMEOUT']);

const isSqliteBusyError = (error) =>
    Boolean(
        SQLITE_BUSY_ERRORS.has(error?.code) ||
            SQLITE_BUSY_ERRORS.has(error?.parent?.code) ||
            SQLITE_BUSY_ERRORS.has(error?.original?.code)
    );

const wait = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

const withSqliteRetry = async (
    operation,
    { retries = 3, delayMs = 50 } = {}
) => {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            return await operation();
        } catch (error) {
            if (!isSqliteBusyError(error) || attempt === retries) {
                throw error;
            }
            await wait(delayMs * (attempt + 1));
            attempt += 1;
        }
    }
    return undefined;
};

const toMinuteOfDay = (momentValue) =>
    momentValue.hour() * 60 + momentValue.minute();

const getWeekStart = (startDate, firstDayOfWeek, timezone) => {
    const base = startDate
        ? moment.tz(startDate, 'YYYY-MM-DD', timezone).startOf('day')
        : moment.tz(timezone).startOf('day');
    const weekday = base.day();
    const diff = (weekday - firstDayOfWeek + 7) % 7;
    return base.clone().subtract(diff, 'days');
};

const buildDayShell = (dateMoment) => ({
    date: dateMoment.format('YYYY-MM-DD'),
    weekday: dateMoment.day(),
    cutoff_minute: null,
    items: [],
    unassignedEligible: [],
    incompleteForScheduling: [],
});

const derivePauses = (slots) => {
    const pauses = [];
    for (let i = 0; i < slots.length - 1; i += 1) {
        const current = slots[i];
        const next = slots[i + 1];
        if (next.start_minute > current.end_minute) {
            pauses.push({
                type: 'pause',
                start_minute: current.end_minute,
                end_minute: next.start_minute,
            });
        }
    }
    return pauses;
};

const buildSlotItems = (slots, entriesBySlot) => {
    const items = [];
    slots.forEach((slot) => {
        const slotEntries = entriesBySlot.get(slot.id) || [];
        const usedMinutes = slotEntries.reduce(
            (total, entry) => total + (entry.end_minute - entry.start_minute),
            0
        );
        items.push({
            type: 'slot',
            slot,
            capacity_minutes: slot.end_minute - slot.start_minute,
            used_minutes: usedMinutes,
            segments: slotEntries.map((entry) => ({
                entry_id: entry.id,
                task_id: entry.task_id,
                task_name: entry.Task?.name || null,
                task_uid: entry.Task?.uid || null,
                pinned: entry.pinned,
                locked: entry.locked,
                start_minute: entry.start_minute,
                end_minute: entry.end_minute,
                slot_id: entry.slot_id,
            })),
        });
    });
    return items;
};

const subtractWindow = (windows, blockStart, blockEnd) => {
    const next = [];
    windows.forEach((window) => {
        if (blockEnd <= window.start || blockStart >= window.end) {
            next.push(window);
            return;
        }
        if (blockStart > window.start) {
            next.push({ start: window.start, end: blockStart });
        }
        if (blockEnd < window.end) {
            next.push({ start: blockEnd, end: window.end });
        }
    });
    return next;
};

const isSlotCompatible = (slot, task) => {
    const taskProjectId = task.project_id;
    const taskProjectAreaId = task.project?.area_id || null;
    if (slot.area_id && taskProjectAreaId === slot.area_id) {
        return true;
    }
    if (taskProjectId) {
        const slotProjectIds =
            slot.projects?.map((project) => project.id) || [];
        return slotProjectIds.includes(taskProjectId);
    }
    return false;
};

const summarizeTask = (task, timezone) => ({
    task_id: task.id,
    name: task.name,
    project_id: task.project_id,
    project_name: task.project?.name || null,
    area_id: task.project?.area_id || null,
    area_name: task.project?.area?.name || null,
    due_date: task.due_date
        ? processDueDateForResponse(task.due_date, timezone)
        : null,
    due_time_minutes: task.due_time_minutes,
    duration_minutes: task.estimated_duration_minutes,
    priority: task.priority,
});

const getDeferInfo = (task, timezone, dateString) => {
    if (!task.defer_until) {
        return { blocked: false, deferMinute: null };
    }
    const deferUntil = processDeferUntilForResponse(task.defer_until, timezone);
    const deferMoment = moment.tz(deferUntil, timezone);
    const deferDate = deferMoment.format('YYYY-MM-DD');
    if (deferDate > dateString) {
        return { blocked: true, deferMinute: null };
    }
    if (deferDate < dateString) {
        return { blocked: false, deferMinute: null };
    }
    return { blocked: false, deferMinute: toMinuteOfDay(deferMoment) };
};

class ScheduleService {
    async getWeekSchedule(userId, { startDate, timezone, firstDayOfWeek }) {
        const safeTimezone = getSafeTimezone(timezone);
        const weekStart = getWeekStart(
            startDate,
            Number(firstDayOfWeek) || 0,
            safeTimezone
        );
        const weekEnd = weekStart.clone().add(6, 'days');
        const today = moment.tz(safeTimezone).startOf('day');

        const days = [];
        for (let i = 0; i < 7; i += 1) {
            const dateMoment = weekStart.clone().add(i, 'days');
            const day = await this.ensureDayPlanned(userId, {
                dateMoment,
                timezone: safeTimezone,
                today,
            });
            days.push(day);
        }

        return {
            start_date: weekStart.format('YYYY-MM-DD'),
            end_date: weekEnd.format('YYYY-MM-DD'),
            timezone: safeTimezone,
            days,
        };
    }

    async getDaySchedule(userId, { date, timezone }) {
        const safeTimezone = getSafeTimezone(timezone);
        const dateMoment = date
            ? moment.tz(date, 'YYYY-MM-DD', safeTimezone).startOf('day')
            : moment.tz(safeTimezone).startOf('day');
        const today = moment.tz(safeTimezone).startOf('day');
        return await this.ensureDayPlanned(userId, {
            dateMoment,
            timezone: safeTimezone,
            today,
        });
    }

    async updateEntryFlags(userId, entryId, { pinned, locked, timezone }) {
        if (pinned === undefined && locked === undefined) {
            throw new ValidationError('Pinned or locked flag is required.');
        }
        const entry = await ScheduleEntry.findOne({
            where: { id: entryId, user_id: userId },
        });
        if (!entry) {
            throw new NotFoundError('Schedule entry not found.');
        }
        const updates = {};
        if (pinned !== undefined) {
            updates.pinned = Boolean(pinned);
        }
        if (locked !== undefined) {
            updates.locked = Boolean(locked);
        }
        await entry.update(updates);

        const safeTimezone = getSafeTimezone(timezone);
        const dateMoment = moment
            .tz(entry.date, 'YYYY-MM-DD', safeTimezone)
            .startOf('day');
        const dirtyReason =
            pinned !== undefined ? 'pin_changed' : 'lock_changed';
        const [dayRecord] = await ScheduleDay.findOrCreate({
            where: { user_id: userId, date: entry.date },
            defaults: {
                user_id: userId,
                date: entry.date,
                timezone: safeTimezone,
                cutoff_minute: null,
                dirty: true,
                dirty_reason: dirtyReason,
            },
        });
        dayRecord.timezone = safeTimezone;
        dayRecord.dirty = true;
        dayRecord.dirty_reason = dirtyReason;
        await dayRecord.save();

        return await this.ensureDayPlanned(userId, {
            dateMoment,
            timezone: safeTimezone,
            today: moment.tz(safeTimezone).startOf('day'),
        });
    }

    async ensureDayPlanned(userId, { dateMoment, timezone, today }) {
        return await withSqliteRetry(async () => {
            const dateString = dateMoment.format('YYYY-MM-DD');
            const isPast = dateMoment.isBefore(today, 'day');
            const isToday = dateMoment.isSame(today, 'day');
            const cutoffMinute = isToday
                ? toMinuteOfDay(moment.tz(timezone))
                : null;
            const entryInclude = [
                {
                    model: Task,
                    attributes: ['id', 'name', 'uid'],
                },
            ];

            const [dayRecord] = await ScheduleDay.findOrCreate({
                where: { user_id: userId, date: dateString },
                defaults: {
                    timezone,
                    cutoff_minute: cutoffMinute,
                    dirty: true,
                },
            });

            if (isToday) {
                dayRecord.timezone = timezone;
                dayRecord.cutoff_minute = cutoffMinute;
                await dayRecord.save();
            }

            const slots = await TimetableSlot.findAll({
                where: { user_id: userId, weekday: dateMoment.day() },
                include: [
                    {
                        model: Project,
                        as: 'projects',
                        through: { attributes: [] },
                    },
                    { model: Area, as: 'area' },
                ],
                order: [['start_minute', 'ASC']],
            });

            const existingEntries = await ScheduleEntry.findAll({
                where: { user_id: userId, date: dateString },
                include: entryInclude,
                order: [['start_minute', 'ASC']],
            });

            if (isPast) {
                return this.buildDayResponse({
                    dateMoment,
                    timezone,
                    cutoffMinute: dayRecord.cutoff_minute,
                    slots,
                    entries: existingEntries,
                    unassignedEligible: [],
                    incompleteForScheduling: [],
                });
            }

            const needsReplan = dayRecord.dirty;
            let protectedEntries = [];
            let remainingEntries = existingEntries;

            if (needsReplan) {
                if (isToday) {
                    const isTimeProtected = (entry) =>
                        entry.end_minute <= cutoffMinute ||
                        (entry.start_minute <= cutoffMinute &&
                            entry.end_minute > cutoffMinute);
                    const isPinnedOrLocked = (entry) =>
                        entry.pinned || entry.locked;
                    protectedEntries = existingEntries.filter(
                        (entry) =>
                            isTimeProtected(entry) ||
                            isPinnedOrLocked(entry)
                    );
                    const removableIds = existingEntries
                        .filter(
                            (entry) =>
                                entry.start_minute >= cutoffMinute &&
                                !isPinnedOrLocked(entry)
                        )
                        .map((entry) => entry.id);
                    if (removableIds.length > 0) {
                        await ScheduleEntry.destroy({
                            where: { id: { [Op.in]: removableIds } },
                        });
                    }
                    remainingEntries = protectedEntries;
                } else {
                    protectedEntries = existingEntries.filter(
                        (entry) => entry.pinned || entry.locked
                    );
                    const removableIds = existingEntries
                        .filter((entry) => !entry.pinned && !entry.locked)
                        .map((entry) => entry.id);
                    if (removableIds.length > 0) {
                        await ScheduleEntry.destroy({
                            where: { id: { [Op.in]: removableIds } },
                        });
                    }
                    remainingEntries = protectedEntries;
                }
            }

            if (!needsReplan) {
                return this.buildDayResponse({
                    dateMoment,
                    timezone,
                    cutoffMinute: dayRecord.cutoff_minute,
                    slots,
                    entries: remainingEntries,
                    unassignedEligible: [],
                    incompleteForScheduling: [],
                });
            }

            const tasks = await Task.findAll({
                where: {
                    user_id: userId,
                    status: { [Op.notIn]: EXCLUDED_STATUSES },
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
                include: [
                    {
                        model: Project,
                        include: [{ model: Area }],
                    },
                ],
                order: [
                    ['due_date', 'ASC'],
                    ['priority', 'DESC'],
                    ['created_at', 'ASC'],
                ],
            });

            const eligibleTasks = [];
            const incompleteForScheduling = [];
            tasks.forEach((task) => {
                const dueDate = task.due_date
                    ? processDueDateForResponse(task.due_date, timezone)
                    : null;
                if (!dueDate) {
                    if (dateString === today.format('YYYY-MM-DD')) {
                        incompleteForScheduling.push({
                            ...summarizeTask(task, timezone),
                            missing: ['due_date'],
                        });
                    }
                    return;
                }
                if (dueDate !== dateString) {
                    return;
                }
                const missingFields = [];
                if (!task.due_date) missingFields.push('due_date');
                if (
                    task.due_time_minutes === null ||
                    task.due_time_minutes === undefined
                ) {
                    missingFields.push('due_time_minutes');
                }
                if (
                    task.estimated_duration_minutes === null ||
                    task.estimated_duration_minutes === undefined
                ) {
                    missingFields.push('estimated_duration_minutes');
                }
                if (missingFields.length > 0) {
                    incompleteForScheduling.push({
                        ...summarizeTask(task, timezone),
                        missing: missingFields,
                    });
                    return;
                }
                eligibleTasks.push(task);
            });

            const sortedTasks = eligibleTasks.sort((a, b) => {
                if (a.due_time_minutes !== b.due_time_minutes) {
                    return a.due_time_minutes - b.due_time_minutes;
                }
                if (a.priority !== b.priority) {
                    return (b.priority || 0) - (a.priority || 0);
                }
                return a.created_at > b.created_at ? 1 : -1;
            });

            const slotWindows = slots.map((slot) => ({
                slot,
                windows: [{ start: slot.start_minute, end: slot.end_minute }],
            }));

            const protectedBySlot = new Map();
            protectedEntries.forEach((entry) => {
                const list = protectedBySlot.get(entry.slot_id) || [];
                list.push(entry);
                protectedBySlot.set(entry.slot_id, list);
            });

            slotWindows.forEach((slotWindow) => {
                const protectedList =
                    protectedBySlot.get(slotWindow.slot.id) || [];
                protectedList.forEach((entry) => {
                    slotWindow.windows = subtractWindow(
                        slotWindow.windows,
                        entry.start_minute,
                        entry.end_minute
                    );
                });
                if (isToday && cutoffMinute !== null) {
                    slotWindow.windows = slotWindow.windows
                        .map((window) => ({
                            start: Math.max(window.start, cutoffMinute),
                            end: window.end,
                        }))
                        .filter((window) => window.end > window.start);
                }
            });

            const newEntries = [];
            const unassignedEligible = [];
            const preallocatedMinutes = protectedEntries.reduce(
                (map, entry) => {
                    const minutes = entry.end_minute - entry.start_minute;
                    map.set(entry.task_id, (map.get(entry.task_id) || 0) + minutes);
                    return map;
                },
                new Map()
            );

            sortedTasks.forEach((task) => {
                const dueTime = task.due_time_minutes;
                const duration = task.estimated_duration_minutes;
                const reservedMinutes = preallocatedMinutes.get(task.id) || 0;
                const requiredMinutes = Math.max(0, duration - reservedMinutes);
                const compatibleWindows = [];

                const deferInfo = getDeferInfo(task, timezone, dateString);
                if (deferInfo.blocked) {
                    unassignedEligible.push({
                        ...summarizeTask(task, timezone),
                        reason_code: 'DEFER_UNTIL_BLOCKS',
                        reason_message:
                            'Defer date blocks scheduling on this day.',
                    });
                    return;
                }

                if (requiredMinutes === 0) {
                    return;
                }

                slotWindows.forEach((slotWindow) => {
                    if (!isSlotCompatible(slotWindow.slot, task)) {
                        return;
                    }
                    slotWindow.windows.forEach((window) => {
                        let start = window.start;
                        if (deferInfo.deferMinute !== null) {
                            start = Math.max(start, deferInfo.deferMinute);
                        }
                        const end = Math.min(window.end, dueTime);
                        if (end > start) {
                            compatibleWindows.push({
                                slotWindow,
                                start,
                                end,
                            });
                        }
                    });
                });

                if (compatibleWindows.length === 0) {
                    const earliestSlotStart = slotWindows
                        .filter((slotWindow) =>
                            isSlotCompatible(slotWindow.slot, task)
                        )
                        .map((slotWindow) => slotWindow.slot.start_minute)
                        .sort((a, b) => a - b)[0];
                    if (
                        deferInfo.deferMinute !== null &&
                        deferInfo.deferMinute >= dueTime
                    ) {
                        unassignedEligible.push({
                            ...summarizeTask(task, timezone),
                            reason_code: 'DEFER_UNTIL_BLOCKS',
                            reason_message:
                                'Defer time is after the task deadline.',
                        });
                    } else if (
                        earliestSlotStart !== undefined &&
                        earliestSlotStart >= dueTime
                    ) {
                        unassignedEligible.push({
                            ...summarizeTask(task, timezone),
                            reason_code: 'DEADLINE_BEFORE_FIRST_AVAILABLE_SLOT',
                            reason_message:
                                'Deadline is before the first available slot.',
                        });
                    } else {
                        unassignedEligible.push({
                            ...summarizeTask(task, timezone),
                            reason_code: 'NO_MATCHING_SLOT',
                            reason_message:
                                'No compatible timetable slot for this task.',
                        });
                    }
                    return;
                }

                const totalAvailable = compatibleWindows.reduce(
                    (total, window) => total + (window.end - window.start),
                    0
                );
                if (totalAvailable < requiredMinutes) {
                    unassignedEligible.push({
                        ...summarizeTask(task, timezone),
                        reason_code: 'NOT_ENOUGH_CAPACITY_BEFORE_DEADLINE',
                        reason_message:
                            'Not enough capacity before the deadline.',
                    });
                    return;
                }

                let remaining = requiredMinutes;
                compatibleWindows.sort((a, b) => a.start - b.start);
                compatibleWindows.forEach((window) => {
                    if (remaining <= 0) return;
                    const available = window.end - window.start;
                    if (available <= 0) return;
                    const allocation = Math.min(remaining, available);
                    const segmentEnd = window.start + allocation;
                    newEntries.push({
                        user_id: userId,
                        date: dateString,
                        start_minute: window.start,
                        end_minute: segmentEnd,
                        task_id: task.id,
                        slot_id: window.slotWindow.slot.id,
                    });
                    window.slotWindow.windows = subtractWindow(
                        window.slotWindow.windows,
                        window.start,
                        segmentEnd
                    );
                    remaining -= allocation;
                });

                if (remaining > 0) {
                    unassignedEligible.push({
                        ...summarizeTask(task, timezone),
                        reason_code: 'SLOT_FRAGMENTATION_TOO_SMALL',
                        reason_message:
                            'Available slots are too fragmented to fit the task.',
                    });
                }
            });

            if (newEntries.length > 0) {
                await ScheduleEntry.bulkCreate(newEntries);
            }

            await dayRecord.update({ dirty: false, dirty_reason: null });

            const finalEntries = await ScheduleEntry.findAll({
                where: { user_id: userId, date: dateString },
                include: entryInclude,
                order: [['start_minute', 'ASC']],
            });

            return this.buildDayResponse({
                dateMoment,
                timezone,
                cutoffMinute: dayRecord.cutoff_minute,
                slots,
                entries: finalEntries,
                unassignedEligible,
                incompleteForScheduling,
            });
        });
    }

    buildDayResponse({
        dateMoment,
        timezone,
        cutoffMinute,
        slots,
        entries,
        unassignedEligible,
        incompleteForScheduling,
    }) {
        const day = buildDayShell(dateMoment);
        day.cutoff_minute = cutoffMinute;

        const entriesBySlot = new Map();
        entries.forEach((entry) => {
            const list = entriesBySlot.get(entry.slot_id) || [];
            list.push(entry);
            entriesBySlot.set(entry.slot_id, list);
        });

        const slotItems = buildSlotItems(slots, entriesBySlot);
        const pauses = derivePauses(slots);
        const items = [];
        let slotIndex = 0;
        let pauseIndex = 0;
        while (slotIndex < slotItems.length || pauseIndex < pauses.length) {
            const nextSlot = slotItems[slotIndex];
            const nextPause = pauses[pauseIndex];
            if (!nextPause) {
                items.push(nextSlot);
                slotIndex += 1;
                continue;
            }
            if (!nextSlot) {
                items.push(nextPause);
                pauseIndex += 1;
                continue;
            }
            if (nextSlot.slot.start_minute < nextPause.start_minute) {
                items.push(nextSlot);
                slotIndex += 1;
            } else {
                items.push(nextPause);
                pauseIndex += 1;
            }
        }

        day.items = items;
        day.unassignedEligible = unassignedEligible;
        day.incompleteForScheduling = incompleteForScheduling;

        return day;
    }
}

module.exports = new ScheduleService();
