import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfISOWeek, endOfISOWeek } from 'date-fns';
import {
    fetchTimeReport,
    TimeReportResponse,
} from '../../utils/reportsService';

const TimeReport: React.FC = () => {
    const { t } = useTranslation();
    const today = new Date();
    const [startDate, setStartDate] = useState(
        format(startOfISOWeek(today), 'yyyy-MM-dd')
    );
    const [endDate, setEndDate] = useState(
        format(endOfISOWeek(today), 'yyyy-MM-dd')
    );
    const [report, setReport] = useState<TimeReportResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTimeReport({ start: startDate, end: endDate });
            setReport(data);
        } catch {
            setError(
                t(
                    'reports.time.error',
                    'Unable to load the time report right now.'
                )
            );
        } finally {
            setLoading(false);
        }
    }, [endDate, startDate, t]);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    const formatMinutes = (value: number | null | undefined) => {
        if (value == null) {
            return '—';
        }
        return `${value} ${t('reports.time.minutes', 'min')}`;
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('reports.time.title', 'Time Report')}
            </h1>

            <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('reports.time.startDate', 'Start date')}
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('reports.time.endDate', 'End date')}
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                </div>
                <button
                    type="button"
                    onClick={loadReport}
                    disabled={loading}
                    className={`px-4 py-2 rounded-md text-white ${
                        loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                >
                    {loading
                        ? t('common.loading', 'Loading...')
                        : t('reports.time.refresh', 'Refresh')}
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                    {error}
                </p>
            )}

            {report && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t(
                                    'reports.time.estimatedTotal',
                                    'Estimated total'
                                )}
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatMinutes(report.totals.estimated_minutes)}
                            </p>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t(
                                    'reports.time.actualTotal',
                                    'Actual total'
                                )}
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatMinutes(report.totals.actual_minutes)}
                            </p>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t('reports.time.delta', 'Delta')}
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatMinutes(report.totals.delta_minutes)}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            {t(
                                'reports.time.byProject',
                                'Breakdown by project'
                            )}
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            {t('reports.time.project', 'Project')}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            {t('reports.time.area', 'Area')}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            {t(
                                                'reports.time.estimated',
                                                'Estimated'
                                            )}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            {t('reports.time.actual', 'Actual')}
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                            {t('reports.time.delta', 'Delta')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {report.by_project.map((entry) => (
                                        <tr key={`project-${entry.project_id ?? 'none'}`}>
                                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                                                {entry.project_name ||
                                                    t(
                                                        'reports.time.noProject',
                                                        'No project'
                                                    )}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                                {entry.area_name || '—'}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                                {formatMinutes(
                                                    entry.estimated_minutes
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                                {formatMinutes(
                                                    entry.actual_minutes
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                                {formatMinutes(
                                                    entry.delta_minutes
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            {t(
                                'reports.time.missingData',
                                'Missing data'
                            )}
                        </h2>
                        {report.tasks_missing.length === 0 ? (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {t(
                                    'reports.time.noMissing',
                                    'All completed tasks have estimates and actuals.'
                                )}
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {report.tasks_missing.map((task) => (
                                    <li
                                        key={task.task_id}
                                        className="text-sm text-gray-700 dark:text-gray-200"
                                    >
                                        <span className="font-medium">
                                            {task.name}
                                        </span>{' '}
                                        —{' '}
                                        {t(
                                            'reports.time.missingLabel',
                                            'Missing'
                                        )}{' '}
                                        {task.missing.join(', ')}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            {t('reports.time.overruns', 'Top overruns')}
                        </h2>
                        {report.top_overruns.length === 0 ? (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {t(
                                    'reports.time.noOverruns',
                                    'No overruns in this range.'
                                )}
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {report.top_overruns.map((task) => (
                                    <li
                                        key={task.task_id}
                                        className="text-sm text-gray-700 dark:text-gray-200"
                                    >
                                        <span className="font-medium">
                                            {task.name}
                                        </span>{' '}
                                        — {formatMinutes(task.delta_minutes)}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeReport;
