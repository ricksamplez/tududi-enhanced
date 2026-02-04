export interface TimetableSlot {
    id?: number;
    user_id?: number;
    weekday: number;
    start_minute: number;
    end_minute: number;
    label?: string | null;
    area_id?: number | null;
    project_ids?: number[];
    projects?: { id: number; name: string }[];
    area?: { id: number; name: string };
    created_at?: string;
    updated_at?: string;
}
