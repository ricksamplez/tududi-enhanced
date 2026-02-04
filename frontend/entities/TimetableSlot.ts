export interface TimetableSlot {
    id?: number;
    user_id?: number;
    weekday: number;
    start_minute: number;
    end_minute: number;
    slot_type: 'work' | 'pause';
    label?: string | null;
    created_at?: string;
    updated_at?: string;
}
