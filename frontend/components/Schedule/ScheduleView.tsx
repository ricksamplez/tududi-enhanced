import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, endOfWeek, format, parseISO } from 'date-fns';
import { ScheduleDay, ScheduleItem, ScheduleWeek } from '../../entities/Schedule';
import { fetchScheduleWeek } from '../../utils/scheduleService';
import { useToast } from '../Shared/ToastContext';
import { getCurrentUser } from '../../utils/userUtils';

const toTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
};

const formatMinutes = (minutes: number) => `${minutes} min`;

const getDayCapacity = (items: ScheduleItem[]) =>
    items.reduce((total, item) => {
        if (item.type === 'slot') {
            return total + item.capacity_minutes;
        }
        return total;
    }, 0);

const getDayUsed = (items: ScheduleItem[]) =>
    items.reduce((total, item) => {
        if (item.type === 'slot') {
            return total + item.used_minutes;
        }
        return total;
    }, 0);

const getUnassignedMinutes = (day: ScheduleDay) =>
    day.unassignedEligible.reduce((total, task) => {
        return total + (task.duration_minutes || 0);
    }, 0);

const ScheduleView: React.FC = () => {
    const { t } = useTranslation();
    const { showErrorToast } = useToast();
    const [week, setWeek] = useState<ScheduleWeek | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadWeek = async () => {
            setIsLoading(true);
            try {
                const currentUser = getCurrentUser();
                const today = new Date();
                const weekStartsOn =
                    currentUser?.first_day_of_week !== undefined
                        ? currentUser.first_day_of_week
                        : 1;
                const weekEnd = endOfWeek(today, { weekStartsOn });
                const data = await fetchScheduleWeek(
                    format(today, 'yyyy-MM-dd')
                );
                setWeek(data);
                const initialDate = format(today, 'yyyy-MM-dd');
                if (data.days.some((day) => day.date === initialDate)) {
                    setSelectedDate(initialDate);
                } else {
                    const fallback = format(weekEnd, 'yyyy-MM-dd');
                    setSelectedDate(fallback);
                }
            } catch (error) {
                console.error('Failed to load schedule:', error);
                showErrorToast(
                    t('schedule.loadError', 'Failed to load schedule data.')
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadWeek();
    }, [showErrorToast, t]);

    const availableDates = useMemo(() => {
        if (!week) return [];
        const today = new Date();
        const weekEnd = parseISO(week.end_date);
        const dates = [];
        let cursor = today;
        while (cursor <= weekEnd) {
            dates.push(format(cursor, 'yyyy-MM-dd'));
            cursor = addDays(cursor, 1);
        }
        return dates;
    }, [week]);

    const selectedDay = useMemo(() => {
        if (!week || !selectedDate) return null;
        return week.days.find((day) => day.date === selectedDate) || null;
    }, [week, selectedDate]);

    if (isLoading) {
        return (
            <div className="p-6 text-gray-700 dark:text-gray-300">
                {t('common.loading', 'Loading...')}
            </div>
        );
    }

    if (!week || !selectedDay) {
        return (
            <div className="p-6 text-gray-700 dark:text-gray-300">
                {t('schedule.noData', 'No schedule data available.')}
            </div>
        );
    }

    const capacityMinutes = getDayCapacity(selectedDay.items);
    const usedMinutes = getDayUsed(selectedDay.items);
    const unassignedMinutes = getUnassignedMinutes(selectedDay);
    const overloadMinutes = Math.max(
        0,
        usedMinutes + unassignedMinutes - capacityMinutes
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {t('schedule.title', 'Schedule')}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t(
                            'schedule.subtitle',
                            'Review scheduled tasks, pauses, and remaining capacity.'
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {availableDates.map((date) => {
                        const dayInfo = week.days.find(
                            (day) => day.date === date
                        );
                        const dayCapacity = dayInfo
                            ? getDayCapacity(dayInfo.items)
                            : 0;
                        const dayUsed = dayInfo
                            ? getDayUsed(dayInfo.items)
                            : 0;
                        const dayUnassigned = dayInfo
                            ? getUnassignedMinutes(dayInfo)
                            : 0;
                        const dayOverload = Math.max(
                            0,
                            dayUsed + dayUnassigned - dayCapacity
                        );
                        const isActive = selectedDate === date;
                        return (
                            <button
                                key={date}
                                type="button"
                                onClick={() => setSelectedDate(date)}
                                className={`px-3 py-2 rounded border text-sm ${
                                    isActive
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                                }`}
                            >
                                <div className="font-medium">
                                    {format(parseISO(date), 'EEE')}
                                </div>
                                <div className="text-xs">
                                    {format(parseISO(date), 'MMM d')}
                                </div>
                                {dayOverload > 0 && (
                                    <div className="text-[10px] text-red-200">
                                        {t('schedule.overloaded', 'Overload')}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('schedule.capacity', 'Capacity')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatMinutes(capacityMinutes)}
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('schedule.used', 'Scheduled')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatMinutes(usedMinutes)}
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('schedule.unassigned', 'Unassigned')}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatMinutes(unassignedMinutes)}
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('schedule.overload', 'Overload')}
                    </div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {formatMinutes(overloadMinutes)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('schedule.timeline', 'Timeline')}
                    </h2>
                    <div className="space-y-3">
                        {selectedDay.items.map((item, index) => {
                            if (item.type === 'pause') {
                                return (
                                    <div
                                        key={`pause-${index}`}
                                        className="rounded-lg p-3 timetable-pause"
                                    >
                                        <div className="text-sm font-semibold">
                                            {t(
                                                'schedule.pause',
                                                'Pause'
                                            )}
                                        </div>
                                        <div className="text-xs">
                                            {toTime(item.start_minute)} -{' '}
                                            {toTime(item.end_minute)}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={`slot-${item.slot.id}`}
                                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {toTime(
                                                    item.slot.start_minute
                                                )}{' '}
                                                -{' '}
                                                {toTime(item.slot.end_minute)}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatMinutes(
                                                    item.used_minutes
                                                )}{' '}
                                                /{' '}
                                                {formatMinutes(
                                                    item.capacity_minutes
                                                )}
                                            </div>
                                        </div>
                                        {item.slot.area?.name && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {item.slot.area.name}
                                            </span>
                                        )}
                                    </div>
                                    {item.segments.length === 0 ? (
                                        <div className="text-xs text-gray-400 mt-2">
                                            {t(
                                                'schedule.noSegments',
                                                'No tasks scheduled.'
                                            )}
                                        </div>
                                    ) : (
                                        <ul className="mt-2 space-y-2">
                                            {item.segments.map((segment) => (
                                                <li
                                                    key={`${segment.task_id}-${segment.start_minute}`}
                                                    className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs text-gray-700 dark:text-gray-200"
                                                >
                                                    <div className="font-semibold">
                                                        {segment.task_name ||
                                                            t(
                                                                'schedule.task',
                                                                'Task'
                                                            )}{' '}
                                                        #{segment.task_id}
                                                    </div>
                                                    <div>
                                                        {toTime(
                                                            segment.start_minute
                                                        )}{' '}
                                                        -{' '}
                                                        {toTime(
                                                            segment.end_minute
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            {t(
                                'schedule.unassignedTasks',
                                'Unassigned tasks'
                            )}
                        </h2>
                        {selectedDay.unassignedEligible.length === 0 ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {t(
                                    'schedule.noUnassigned',
                                    'All eligible tasks are scheduled.'
                                )}
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {selectedDay.unassignedEligible.map((task) => (
                                    <li
                                        key={task.task_id}
                                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm"
                                    >
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {task.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {task.project_name ||
                                                task.area_name ||
                                                t('common.none', 'None')}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {t(
                                                'schedule.due',
                                                'Due'
                                            )}{' '}
                                            {task.due_date} ·{' '}
                                            {toTime(
                                                task.due_time_minutes || 0
                                            )}{' '}
                                            ·{' '}
                                            {formatMinutes(
                                                task.duration_minutes || 0
                                            )}{' '}
                                            ·{' '}
                                            {t(
                                                'schedule.priority',
                                                'Priority'
                                            )}{' '}
                                            {task.priority ?? 0}
                                        </div>
                                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                            {task.reason_code}:{' '}
                                            {task.reason_message}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            {t(
                                'schedule.incompleteTasks',
                                'Incomplete for scheduling'
                            )}
                        </h2>
                        {selectedDay.incompleteForScheduling.length === 0 ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {t(
                                    'schedule.noIncomplete',
                                    'All tasks have the required fields.'
                                )}
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {selectedDay.incompleteForScheduling.map(
                                    (task) => (
                                        <li
                                            key={task.task_id}
                                            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm"
                                        >
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {task.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {t(
                                                    'schedule.missing',
                                                    'Missing'
                                                )}
                                                :{' '}
                                                {(task.missing || []).join(
                                                    ', '
                                                )}
                                            </div>
                                        </li>
                                    )
                                )}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleView;
