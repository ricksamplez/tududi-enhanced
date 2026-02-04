import { getApiPath } from '../config/paths';
import { handleAuthResponse } from './authUtils';
import { WeekPlan } from '../entities/WeekPlan';

export const fetchWeekPlan = async (startDate: string): Promise<WeekPlan> => {
    const response = await fetch(
        getApiPath(`planning/week?start=${encodeURIComponent(startDate)}`),
        {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        }
    );
    await handleAuthResponse(response, 'Failed to fetch week plan.');
    return await response.json();
};
