import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClockIcon } from '@heroicons/react/24/outline';
import { getApiPath } from '../../../config/paths';

interface ProductivityTabProps {
    isActive: boolean;
    pomodoroEnabled: boolean;
    onTogglePomodoro: () => void;
}

const ProductivityTab: React.FC<ProductivityTabProps> = ({
    isActive,
    pomodoroEnabled,
    onTogglePomodoro,
}) => {
    const { t } = useTranslation();
    const [calendarLink, setCalendarLink] = useState<string | null>(null);
    const [calendarTokenExists, setCalendarTokenExists] = useState(false);
    const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [calendarCopied, setCalendarCopied] = useState(false);

    if (!isActive) return null;

    const buildCalendarUrl = (token: string) =>
        new URL(
            getApiPath(`calendar/feed/${token}.ics`),
            window.location.origin
        ).toString();

    const handleCalendarTokenRequest = async () => {
        setCalendarLoading(true);
        setCalendarCopied(false);
        setCalendarMessage(null);

        try {
            const response = await fetch(getApiPath('calendar/feed-token'), {
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch calendar token');
            }

            const data = await response.json();
            setCalendarTokenExists(Boolean(data.exists));
            if (data.token) {
                setCalendarLink(buildCalendarUrl(data.token));
            } else {
                setCalendarLink(null);
            }
            if (data.message) {
                setCalendarMessage(data.message);
            }
        } catch {
            setCalendarMessage(
                t(
                    'profile.calendarFeed.error',
                    'Unable to load the calendar link right now.'
                )
            );
        } finally {
            setCalendarLoading(false);
        }
    };

    const handleCalendarTokenRotate = async () => {
        setCalendarLoading(true);
        setCalendarCopied(false);
        setCalendarMessage(null);

        try {
            const response = await fetch(
                getApiPath('calendar/feed-token/rotate'),
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        Accept: 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to rotate calendar token');
            }

            const data = await response.json();
            setCalendarTokenExists(true);
            setCalendarLink(buildCalendarUrl(data.token));
        } catch {
            setCalendarMessage(
                t(
                    'profile.calendarFeed.error',
                    'Unable to load the calendar link right now.'
                )
            );
        } finally {
            setCalendarLoading(false);
        }
    };

    const handleCopyCalendarLink = async () => {
        if (!calendarLink) return;
        try {
            await navigator.clipboard.writeText(calendarLink);
            setCalendarCopied(true);
        } catch {
            setCalendarMessage(
                t(
                    'profile.calendarFeed.copyError',
                    'Copy failed. Please copy the link manually.'
                )
            );
        }
    };

    return (
        <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <ClockIcon className="w-6 h-6 mr-3 text-green-500" />
                {t('profile.productivityFeatures', 'Productivity Features')}
            </h3>

            <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t(
                                'profile.enablePomodoro',
                                'Enable Pomodoro Timer'
                            )}
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t(
                                'profile.pomodoroDescription',
                                'Enable the Pomodoro timer in the navigation bar for focused work sessions.'
                            )}
                        </p>
                    </div>
                    <div
                        className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out rounded-full cursor-pointer ${
                            pomodoroEnabled
                                ? 'bg-blue-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        onClick={onTogglePomodoro}
                    >
                        <span
                            className={`absolute left-0 top-0 bottom-0 m-1 w-4 h-4 transition-transform duration-200 ease-in-out transform bg-white rounded-full ${
                                pomodoroEnabled
                                    ? 'translate-x-6'
                                    : 'translate-x-0'
                            }`}
                        ></span>
                    </div>
                </div>

                <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t(
                                    'profile.calendarFeed.title',
                                    'Calendar subscription'
                                )}
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {t(
                                    'profile.calendarFeed.description',
                                    'Subscribe in Google Calendar or Apple Calendar to see your Tududi tasks.'
                                )}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                type="button"
                                disabled={calendarLoading}
                                onClick={
                                    calendarTokenExists
                                        ? handleCalendarTokenRotate
                                        : handleCalendarTokenRequest
                                }
                                className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-white ${
                                    calendarLoading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500'
                                }`}
                            >
                                {calendarLoading
                                    ? t('common.loading', 'Loading...')
                                    : calendarTokenExists
                                      ? t(
                                            'profile.calendarFeed.rotateButton',
                                            'Rotate subscription link'
                                        )
                                      : t(
                                            'profile.calendarFeed.generateButton',
                                            'Generate calendar subscription link'
                                        )}
                            </button>
                            {calendarLink && (
                                <button
                                    type="button"
                                    onClick={handleCopyCalendarLink}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    {calendarCopied
                                        ? t(
                                              'profile.calendarFeed.copied',
                                              'Copied'
                                          )
                                        : t(
                                              'profile.calendarFeed.copyButton',
                                              'Copy link'
                                          )}
                                </button>
                            )}
                        </div>

                        {calendarLink && (
                            <input
                                type="text"
                                readOnly
                                value={calendarLink}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                        )}

                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            {t(
                                'profile.calendarFeed.warning',
                                'Rotating the link invalidates the previous subscription. The token is shown only once.'
                            )}
                        </p>

                        {calendarMessage && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                                {calendarMessage}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductivityTab;
