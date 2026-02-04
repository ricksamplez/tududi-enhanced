import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { WeekPlan } from '../../entities/WeekPlan';
import { fetchWeekPlan } from '../../utils/planningService';
import { useToast } from '../Shared/ToastContext';
import { Link } from 'react-router-dom';

const formatMinutes = (minutes: number) => `${minutes} min`;

const WeekPlanning: React.FC = () => {
    const { t } = useTranslation();
    const { showErrorToast } = useToast();
    const [weekStart, setWeekStart] = useState<Date>(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );
    const [plan, setPlan] = useState<WeekPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const weekStartString = useMemo(
        () => format(weekStart, 'yyyy-MM-dd'),
        [weekStart]
    );

    useEffect(() => {
        const loadPlan = async () => {
            setIsLoading(true);
            try {
                const data = await fetchWeekPlan(weekStartString);
                setPlan(data);
            } catch (error) {
                console.error('Failed to load week plan:', error);
                showErrorToast(
                    t(
                        'planning.loadError',
                        'Failed to load week planning data.'
                    )
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadPlan();
    }, [weekStartString, showErrorToast, t]);

    const summary = useMemo(() => {
        if (!plan) return null;
        const totalCapacity = plan.days.reduce(
            (total, day) => total + day.capacity_minutes,
            0
        );
        const totalPlanned = plan.days.reduce(
            (total, day) => total + day.planned_minutes,
            0
        );
        const totalOverload = plan.days.reduce(
            (total, day) => total + day.overload_minutes,
            0
        );
        return { totalCapacity, totalPlanned, totalOverload };
    }, [plan]);

    const handleWeekChange = (direction: 'prev' | 'next') => {
        setWeekStart((prev) => addWeeks(prev, direction === 'next' ? 1 : -1));
    };

    if (isLoading) {
        return (
            <div className="p-6 text-gray-700 dark:text-gray-300">
                {t('common.loading', 'Loading...')}
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="p-6 text-gray-700 dark:text-gray-300">
                {t('planning.noData', 'No planning data available.')}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {t('planning.title', 'Week planning')}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t(
                            'planning.subtitle',
                            'Plan work capacity and see overloads for the week.'
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleWeekChange('prev')}
                        className="px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                    >
                        {t('common.previous', 'Previous')}
                    </button>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {format(weekStart, 'MMM d')} -{' '}
                        {format(addDays(weekStart, 6), 'MMM d')}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleWeekChange('next')}
                        className="px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                    >
                        {t('common.next', 'Next')}
                    </button>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('planning.capacity', 'Weekly capacity')}
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatMinutes(summary.totalCapacity)}
                        </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('planning.planned', 'Planned work')}
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatMinutes(summary.totalPlanned)}
                        </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('planning.overload', 'Overload')}
                        </div>
                        <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                            {formatMinutes(summary.totalOverload)}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {plan.days.map((day) => (
                    <div
                        key={day.date}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {format(parseISO(day.date), 'EEEE')}
                                </div>
                                <div className="text-base font-semibold text-gray-900 dark:text-white">
                                    {format(parseISO(day.date), 'MMM d')}
                                </div>
                            </div>
                            {day.overload_minutes > 0 && (
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                    {t('planning.overloaded', 'Overloaded')}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300">
                            <span>
                                {t('planning.capacity', 'Capacity')}:{' '}
                                {formatMinutes(day.capacity_minutes)}
                            </span>
                            <span>
                                {t('planning.planned', 'Planned')}:{' '}
                                {formatMinutes(day.planned_minutes)}
                            </span>
                            <span>
                                {t('planning.remaining', 'Remaining')}:{' '}
                                {formatMinutes(day.remaining_minutes)}
                            </span>
                            {day.overload_minutes > 0 && (
                                <span className="text-red-600 dark:text-red-400">
                                    {t('planning.overload', 'Overload')}:{' '}
                                    {formatMinutes(day.overload_minutes)}
                                </span>
                            )}
                        </div>

                        {day.tasks.length === 0 ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {t('planning.noTasks', 'No tasks assigned.')}
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {day.tasks.map((task) => (
                                    <li
                                        key={task.id}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <Link
                                            to={`/task/${task.uid}`}
                                            className={`font-medium ${
                                                task.overdue
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-gray-900 dark:text-gray-100'
                                            }`}
                                        >
                                            {task.name}
                                        </Link>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatMinutes(
                                                task.planned_duration_minutes
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('planning.unassigned', 'Unassigned tasks')}
                    </h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatMinutes(plan.unassigned_minutes)}
                    </div>
                </div>
                {plan.unassigned_tasks.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t(
                            'planning.noUnassigned',
                            'No unassigned tasks.'
                        )}
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {plan.unassigned_tasks.map((task) => (
                            <li
                                key={task.id}
                                className="flex items-center justify-between text-sm"
                            >
                                <Link
                                    to={`/task/${task.uid}`}
                                    className="font-medium text-gray-900 dark:text-gray-100"
                                >
                                    {task.name}
                                </Link>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatMinutes(task.planned_duration_minutes)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default WeekPlanning;
