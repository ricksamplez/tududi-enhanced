export type SchedulePauseItem = {
    type: 'pause';
    start_minute: number;
    end_minute: number;
};

export type ScheduleSlotItem = {
    type: 'slot';
    slot: {
        id: number;
        start_minute: number;
        end_minute: number;
        area_id?: number | null;
        projects?: { id: number; name: string }[];
        area?: { id: number; name: string };
    };
    capacity_minutes: number;
    used_minutes: number;
    segments: {
        entry_id: number;
        task_id: number;
        task_name: string | null;
        task_uid: string | null;
        pinned: boolean;
        locked: boolean;
        start_minute: number;
        end_minute: number;
        slot_id: number;
    }[];
};

export type ScheduleItem = SchedulePauseItem | ScheduleSlotItem;

export type ScheduleTaskInfo = {
    task_id: number;
    name: string;
    project_id: number | null;
    project_name: string | null;
    area_id: number | null;
    area_name: string | null;
    due_date: string | null;
    due_time_minutes: number | null;
    duration_minutes: number | null;
    priority: number | null;
    reason_code?: string;
    reason_message?: string;
    missing?: string[];
};

export type ScheduleDay = {
    date: string;
    weekday: number;
    cutoff_minute: number | null;
    items: ScheduleItem[];
    unassignedEligible: ScheduleTaskInfo[];
    incompleteForScheduling: ScheduleTaskInfo[];
};

export type ScheduleWeek = {
    start_date: string;
    end_date: string;
    timezone: string;
    days: ScheduleDay[];
};
