import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    createTimetableSlot,
    deleteTimetableSlot,
    fetchTimetableSlots,
    updateTimetableSlot,
} from '../utils/timetableService';
import { TimetableSlot } from '../entities/TimetableSlot';
import { useToast } from './Shared/ToastContext';

const WEEKDAYS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

const toMinutes = (timeValue: string) => {
    if (!timeValue) return null;
    const [hours, minutes] = timeValue.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
};

const toTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
};

const Timetable: React.FC = () => {
    const { t } = useTranslation();
    const { showSuccessToast, showErrorToast } = useToast();
    const [slots, setSlots] = useState<TimetableSlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
    const [formState, setFormState] = useState({
        weekday: 1,
        startTime: '09:00',
        endTime: '17:00',
        slotType: 'work',
        label: '',
    });
    const [editState, setEditState] = useState({
        startTime: '',
        endTime: '',
        slotType: 'work',
        label: '',
    });

    useEffect(() => {
        const loadSlots = async () => {
            try {
                const data = await fetchTimetableSlots();
                setSlots(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to load timetable slots:', error);
                showErrorToast(
                    t('timetable.loadError', 'Failed to load timetable slots')
                );
            } finally {
                setIsLoading(false);
            }
        };
        loadSlots();
    }, [showErrorToast, t]);

    const groupedSlots = useMemo(() => {
        const grouped: Record<number, TimetableSlot[]> = {};
        slots.forEach((slot) => {
            const list = grouped[slot.weekday] || [];
            list.push(slot);
            grouped[slot.weekday] = list;
        });
        Object.values(grouped).forEach((list) =>
            list.sort((a, b) => a.start_minute - b.start_minute)
        );
        return grouped;
    }, [slots]);

    const isValidTimeRange = (
        startMinute: number | null,
        endMinute: number | null
    ) => {
        if (startMinute === null || endMinute === null) {
            showErrorToast(
                t('timetable.invalidTime', 'Please provide valid times.')
            );
            return false;
        }

        if (endMinute <= startMinute) {
            showErrorToast(
                t(
                    'timetable.invalidRange',
                    'End time must be after the start time.'
                )
            );
            return false;
        }

        return true;
    };

    const handleCreateSlot = async () => {
        const startMinute = toMinutes(formState.startTime);
        const endMinute = toMinutes(formState.endTime);
        if (!isValidTimeRange(startMinute, endMinute)) {
            return;
        }
        setIsSaving(true);
        try {
            const payload: TimetableSlot = {
                weekday: formState.weekday,
                start_minute: startMinute,
                end_minute: endMinute,
                slot_type: formState.slotType as 'work' | 'pause',
                label: formState.label || null,
            };
            const created = await createTimetableSlot(payload);
            setSlots((prev) => [...prev, created]);
            setFormState((prev) => ({
                ...prev,
                label: '',
            }));
            showSuccessToast(
                t('timetable.created', 'Timetable slot created')
            );
        } catch (error) {
            console.error('Failed to create slot:', error);
            showErrorToast(
                t('timetable.createError', 'Failed to create timetable slot')
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSlot = async (slotId: number) => {
        try {
            await deleteTimetableSlot(slotId);
            setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
            showSuccessToast(
                t('timetable.deleted', 'Timetable slot deleted')
            );
        } catch (error) {
            console.error('Failed to delete slot:', error);
            showErrorToast(
                t('timetable.deleteError', 'Failed to delete timetable slot')
            );
        }
    };

    const startEdit = (slot: TimetableSlot) => {
        setEditingSlotId(slot.id || null);
        setEditState({
            startTime: toTime(slot.start_minute),
            endTime: toTime(slot.end_minute),
            slotType: slot.slot_type,
            label: slot.label || '',
        });
    };

    const handleUpdateSlot = async (slot: TimetableSlot) => {
        if (!slot.id) return;
        const startMinute = toMinutes(editState.startTime);
        const endMinute = toMinutes(editState.endTime);
        if (!isValidTimeRange(startMinute, endMinute)) {
            return;
        }

        setIsSaving(true);
        try {
            const updated = await updateTimetableSlot(slot.id, {
                start_minute: startMinute,
                end_minute: endMinute,
                slot_type: editState.slotType as 'work' | 'pause',
                label: editState.label || null,
            });
            setSlots((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item))
            );
            setEditingSlotId(null);
            showSuccessToast(
                t('timetable.updated', 'Timetable slot updated')
            );
        } catch (error) {
            console.error('Failed to update slot:', error);
            showErrorToast(
                t('timetable.updateError', 'Failed to update timetable slot')
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 text-gray-700 dark:text-gray-300">
                {t('common.loading', 'Loading...')}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t('timetable.title', 'Timetable')}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t(
                        'timetable.subtitle',
                        'Define work and pause slots for each weekday.'
                    )}
                </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    {t('timetable.addSlot', 'Add slot')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <select
                        value={formState.weekday}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                weekday: Number(event.target.value),
                            }))
                        }
                        className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                        {WEEKDAYS.map((day) => (
                            <option key={day.value} value={day.value}>
                                {t(`timetable.weekday.${day.label}`, day.label)}
                            </option>
                        ))}
                    </select>
                    <input
                        type="time"
                        value={formState.startTime}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                startTime: event.target.value,
                            }))
                        }
                        className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                    <input
                        type="time"
                        value={formState.endTime}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                endTime: event.target.value,
                            }))
                        }
                        className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                    <select
                        value={formState.slotType}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                slotType: event.target.value,
                            }))
                        }
                        className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                        <option value="work">
                            {t('timetable.slotType.work', 'Work')}
                        </option>
                        <option value="pause">
                            {t('timetable.slotType.pause', 'Pause')}
                        </option>
                    </select>
                    <input
                        type="text"
                        value={formState.label}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                label: event.target.value,
                            }))
                        }
                        placeholder={t('timetable.label', 'Label (optional)')}
                        className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleCreateSlot}
                    disabled={isSaving}
                    className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {isSaving
                        ? t('common.saving', 'Saving...')
                        : t('timetable.add', 'Add slot')}
                </button>
            </div>

            <div className="space-y-6">
                {WEEKDAYS.map((day) => {
                    const daySlots = groupedSlots[day.value] || [];
                    return (
                        <div
                            key={day.value}
                            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                        >
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                                {t(`timetable.weekday.${day.label}`, day.label)}
                            </h3>
                            {daySlots.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t(
                                        'timetable.noSlots',
                                        'No slots yet.'
                                    )}
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {daySlots.map((slot) => {
                                        const isEditing =
                                            editingSlotId === slot.id;
                                        return (
                                            <li
                                                key={slot.id}
                                                className={`rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${
                                                    slot.slot_type === 'pause'
                                                        ? 'timetable-pause'
                                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                                }`}
                                            >
                                                {isEditing ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                        <input
                                                            type="time"
                                                            value={
                                                                editState.startTime
                                                            }
                                                            onChange={(event) =>
                                                                setEditState(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        startTime:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    })
                                                                )
                                                            }
                                                            className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                                        />
                                                        <input
                                                            type="time"
                                                            value={
                                                                editState.endTime
                                                            }
                                                            onChange={(event) =>
                                                                setEditState(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        endTime:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    })
                                                                )
                                                            }
                                                            className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                                        />
                                                        <select
                                                            value={
                                                                editState.slotType
                                                            }
                                                            onChange={(event) =>
                                                                setEditState(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        slotType:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    })
                                                                )
                                                            }
                                                            className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                                        >
                                                            <option value="work">
                                                                {t(
                                                                    'timetable.slotType.work',
                                                                    'Work'
                                                                )}
                                                            </option>
                                                            <option value="pause">
                                                                {t(
                                                                    'timetable.slotType.pause',
                                                                    'Pause'
                                                                )}
                                                            </option>
                                                        </select>
                                                        <input
                                                            type="text"
                                                            value={
                                                                editState.label
                                                            }
                                                            onChange={(event) =>
                                                                setEditState(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        label: event
                                                                            .target
                                                                            .value,
                                                                    })
                                                                )
                                                            }
                                                            className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                                            placeholder={t(
                                                                'timetable.label',
                                                                'Label (optional)'
                                                            )}
                                                        />
                                                        <div className="flex gap-2 md:col-span-4">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleUpdateSlot(
                                                                        slot
                                                                    )
                                                                }
                                                                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                            >
                                                                {t(
                                                                    'common.save',
                                                                    'Save'
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditingSlotId(
                                                                        null
                                                                    )
                                                                }
                                                                className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
                                                            >
                                                                {t(
                                                                    'common.cancel',
                                                                    'Cancel'
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-semibold">
                                                                {toTime(
                                                                    slot.start_minute
                                                                )}{' '}
                                                                -{' '}
                                                                {toTime(
                                                                    slot.end_minute
                                                                )}
                                                            </div>
                                                            <div className="text-xs opacity-80">
                                                                {slot.slot_type ===
                                                                'pause'
                                                                    ? t(
                                                                          'timetable.slotType.pause',
                                                                          'Pause'
                                                                      )
                                                                    : t(
                                                                          'timetable.slotType.work',
                                                                          'Work'
                                                                      )}
                                                                {slot.label
                                                                    ? ` · ${slot.label}`
                                                                    : ''}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    startEdit(
                                                                        slot
                                                                    )
                                                                }
                                                                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
                                                            >
                                                                {t(
                                                                    'common.edit',
                                                                    'Edit'
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeleteSlot(
                                                                        slot.id as number
                                                                    )
                                                                }
                                                                className="px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded"
                                                            >
                                                                {t(
                                                                    'common.delete',
                                                                    'Delete'
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Timetable;
