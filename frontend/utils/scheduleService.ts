import { getApiPath } from '../config/paths';
import { handleAuthResponse } from './authUtils';
import { ScheduleDay, ScheduleWeek } from '../entities/Schedule';

export const fetchScheduleWeek = async (
    start?: string
): Promise<ScheduleWeek> => {
    const params = new URLSearchParams();
    if (start) {
        params.set('start', start);
    }
    const response = await fetch(
        getApiPath(`schedule/week${params.toString() ? `?${params}` : ''}`),
        {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        }
    );
    await handleAuthResponse(response, 'Failed to fetch schedule.');
    return await response.json();
};

export const fetchScheduleDay = async (date?: string): Promise<ScheduleDay> => {
    const params = new URLSearchParams();
    if (date) {
        params.set('date', date);
    }
    const response = await fetch(
        getApiPath(`schedule/day${params.toString() ? `?${params}` : ''}`),
        {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        }
    );
    await handleAuthResponse(response, 'Failed to fetch schedule.');
    return await response.json();
};

export const updateScheduleEntry = async (
    entryId: number,
    updates: { pinned?: boolean; locked?: boolean }
): Promise<ScheduleDay> => {
    const response = await fetch(getApiPath(`schedule/entries/${entryId}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
    });
    await handleAuthResponse(response, 'Failed to update schedule entry.');
    return await response.json();
};
