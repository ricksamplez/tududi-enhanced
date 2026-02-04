export interface WeekPlanTask {
    id: number;
    uid: string;
    name: string;
    due_date: string | null;
    estimated_duration_minutes: number | null;
    planned_duration_minutes: number;
    overdue?: boolean;
}

export interface WeekPlanDay {
    date: string;
    weekday: number;
    capacity_minutes: number;
    planned_minutes: number;
    remaining_minutes: number;
    overload_minutes: number;
    tasks: WeekPlanTask[];
}

export interface WeekPlan {
    start_date: string;
    end_date: string;
    timezone: string;
    days: WeekPlanDay[];
    unassigned_tasks: WeekPlanTask[];
    unassigned_minutes: number;
}
