import { TimetableSlot } from '../entities/TimetableSlot';
import { getApiPath } from '../config/paths';
import { handleAuthResponse } from './authUtils';

export const fetchTimetableSlots = async (
    weekday?: number
): Promise<TimetableSlot[]> => {
    const params = new URLSearchParams();
    if (weekday !== undefined) {
        params.set('weekday', String(weekday));
    }
    const response = await fetch(
        getApiPath(`timetable/slots${params.toString() ? `?${params}` : ''}`),
        {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        }
    );
    await handleAuthResponse(response, 'Failed to fetch timetable slots.');
    return await response.json();
};

export const createTimetableSlot = async (
    payload: TimetableSlot
): Promise<TimetableSlot> => {
    const response = await fetch(getApiPath('timetable/slots'), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify(payload),
    });
    await handleAuthResponse(response, 'Failed to create timetable slot.');
    return await response.json();
};

export const updateTimetableSlot = async (
    id: number,
    payload: Partial<TimetableSlot>
): Promise<TimetableSlot> => {
    const response = await fetch(getApiPath(`timetable/slots/${id}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify(payload),
    });
    await handleAuthResponse(response, 'Failed to update timetable slot.');
    return await response.json();
};

export const deleteTimetableSlot = async (id: number): Promise<void> => {
    const response = await fetch(getApiPath(`timetable/slots/${id}`), {
        method: 'DELETE',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });
    await handleAuthResponse(response, 'Failed to delete timetable slot.');
};
