'use strict';

const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { Task, Project, Area } = require('../../models');
const {
    getSafeTimezone,
    dateStringToUTC,
} = require('../../utils/timezone-utils');

const DEFAULT_GROUP = 'project';

const buildDateRange = (start, end, timezone) => {
    const safeTimezone = getSafeTimezone(timezone);

    if (!start || !end) {
        const now = moment.tz(safeTimezone);
        const startMoment = now.clone().startOf('isoWeek');
        const endMoment = now.clone().endOf('isoWeek');
        return {
            startDate: startMoment.format('YYYY-MM-DD'),
            endDate: endMoment.format('YYYY-MM-DD'),
            startUtc: startMoment.utc().toDate(),
            endUtc: endMoment.utc().toDate(),
            timezone: safeTimezone,
        };
    }

    const startMoment = moment.tz(start, 'YYYY-MM-DD', true, safeTimezone);
    const endMoment = moment.tz(end, 'YYYY-MM-DD', true, safeTimezone);

    if (!startMoment.isValid() || !endMoment.isValid()) {
        return null;
    }

    return {
        startDate: startMoment.format('YYYY-MM-DD'),
        endDate: endMoment.format('YYYY-MM-DD'),
        startUtc: dateStringToUTC(start, safeTimezone, 'start'),
        endUtc: dateStringToUTC(end, safeTimezone, 'end'),
        timezone: safeTimezone,
    };
};

const calculateTotals = (tasks) => {
    const totals = tasks.reduce(
        (acc, task) => {
            const estimated = task.estimated_duration_minutes ?? 0;
            const actual = task.actual_duration_minutes ?? 0;
            return {
                estimated_minutes: acc.estimated_minutes + estimated,
                actual_minutes: acc.actual_minutes + actual,
            };
        },
        { estimated_minutes: 0, actual_minutes: 0 }
    );

    const delta_minutes = totals.actual_minutes - totals.estimated_minutes;
    const ratio = totals.estimated_minutes
        ? totals.actual_minutes / totals.estimated_minutes
        : null;

    return { ...totals, delta_minutes, ratio };
};

const buildProjectKey = (task) => {
    if (!task.Project) {
        return 'none';
    }
    return String(task.Project.id);
};

const buildProjectSummary = (task) => {
    if (!task.Project) {
        return {
            project_id: null,
            project_name: 'No Project',
            area_id: null,
            area_name: null,
        };
    }

    return {
        project_id: task.Project.id,
        project_name: task.Project.name,
        area_id: task.Project.Area ? task.Project.Area.id : null,
        area_name: task.Project.Area ? task.Project.Area.name : null,
    };
};

const buildMissingEntry = (task) => {
    const missing = [];
    if (task.estimated_duration_minutes == null) {
        missing.push('estimated');
    }
    if (task.actual_duration_minutes == null) {
        missing.push('actual');
    }

    return {
        task_id: task.id,
        uid: task.uid,
        name: task.name,
        project_id: task.project_id ?? null,
        estimated_duration_minutes: task.estimated_duration_minutes,
        actual_duration_minutes: task.actual_duration_minutes,
        completed_at: task.completed_at
            ? task.completed_at.toISOString()
            : null,
        missing,
    };
};

const buildOverrunEntry = (task) => {
    const estimated = task.estimated_duration_minutes ?? 0;
    const actual = task.actual_duration_minutes ?? 0;
    return {
        task_id: task.id,
        uid: task.uid,
        name: task.name,
        project_id: task.project_id ?? null,
        estimated_duration_minutes: task.estimated_duration_minutes,
        actual_duration_minutes: task.actual_duration_minutes,
        delta_minutes: actual - estimated,
        completed_at: task.completed_at
            ? task.completed_at.toISOString()
            : null,
    };
};

const getTimeReport = async (userId, { start, end, group, timezone }) => {
    const range = buildDateRange(start, end, timezone);
    if (!range) {
        return null;
    }

    const tasks = await Task.findAll({
        where: {
            user_id: userId,
            status: {
                [Op.in]: [Task.STATUS.DONE, 'done'],
            },
            completed_at: {
                [Op.between]: [range.startUtc, range.endUtc],
            },
            parent_task_id: null,
        },
        include: [
            {
                model: Project,
                required: false,
                include: [
                    {
                        model: Area,
                        required: false,
                    },
                ],
            },
        ],
        order: [['completed_at', 'ASC']],
    });

    const totals = calculateTotals(tasks);

    const byProjectMap = new Map();
    tasks.forEach((task) => {
        const key = buildProjectKey(task);
        if (!byProjectMap.has(key)) {
            byProjectMap.set(key, {
                ...buildProjectSummary(task),
                estimated_minutes: 0,
                actual_minutes: 0,
                delta_minutes: 0,
                task_count: 0,
            });
        }
        const entry = byProjectMap.get(key);
        const estimated = task.estimated_duration_minutes ?? 0;
        const actual = task.actual_duration_minutes ?? 0;
        entry.estimated_minutes += estimated;
        entry.actual_minutes += actual;
        entry.delta_minutes = entry.actual_minutes - entry.estimated_minutes;
        entry.task_count += 1;
    });

    const tasksMissing = tasks
        .filter(
            (task) =>
                task.estimated_duration_minutes == null ||
                task.actual_duration_minutes == null
        )
        .map(buildMissingEntry);

    const overruns = tasks
        .filter(
            (task) =>
                task.estimated_duration_minutes != null &&
                task.actual_duration_minutes != null
        )
        .map(buildOverrunEntry)
        .sort((a, b) => b.delta_minutes - a.delta_minutes)
        .slice(0, 10);

    const groupBy = group || DEFAULT_GROUP;
    const by_project = Array.from(byProjectMap.values());

    return {
        start_date: range.startDate,
        end_date: range.endDate,
        timezone: range.timezone,
        group_by: groupBy,
        totals,
        by_project,
        tasks_missing: tasksMissing,
        top_overruns: overruns,
    };
};

module.exports = {
    getTimeReport,
};
