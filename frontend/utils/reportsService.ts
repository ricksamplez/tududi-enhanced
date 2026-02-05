import { getApiPath } from '../config/paths';

export interface TimeReportTotals {
    estimated_minutes: number;
    actual_minutes: number;
    delta_minutes: number;
    ratio: number | null;
}

export interface TimeReportProjectSummary {
    project_id: number | null;
    project_name: string | null;
    area_id: number | null;
    area_name: string | null;
    estimated_minutes: number;
    actual_minutes: number;
    delta_minutes: number;
    task_count: number;
}

export interface TimeReportTaskMissing {
    task_id: number;
    uid: string;
    name: string;
    project_id: number | null;
    estimated_duration_minutes: number | null;
    actual_duration_minutes: number | null;
    completed_at: string | null;
    missing: string[];
}

export interface TimeReportOverrun {
    task_id: number;
    uid: string;
    name: string;
    project_id: number | null;
    estimated_duration_minutes: number | null;
    actual_duration_minutes: number | null;
    delta_minutes: number;
    completed_at: string | null;
}

export interface TimeReportResponse {
    start_date: string;
    end_date: string;
    timezone: string;
    group_by: string;
    totals: TimeReportTotals;
    by_project: TimeReportProjectSummary[];
    tasks_missing: TimeReportTaskMissing[];
    top_overruns: TimeReportOverrun[];
}

export const fetchTimeReport = async (params: {
    start: string;
    end: string;
}): Promise<TimeReportResponse> => {
    const query = new URLSearchParams({
        start: params.start,
        end: params.end,
    });

    const response = await fetch(
        getApiPath(`reports/time?${query.toString()}`),
        {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch time report');
    }

    return response.json();
};
