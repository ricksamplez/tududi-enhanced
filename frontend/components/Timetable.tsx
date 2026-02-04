import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    createTimetableSlot,
    deleteTimetableSlot,
    fetchTimetableSlots,
    updateTimetableSlot,
} from '../utils/timetableService';
import { TimetableSlot } from '../entities/TimetableSlot';
import { Area } from '../entities/Area';
import { Project } from '../entities/Project';
import { fetchAreas } from '../utils/areasService';
import { fetchProjects } from '../utils/projectsService';
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
    const [areas, setAreas] = useState<Area[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
    const [formState, setFormState] = useState({
        weekday: 1,
        startTime: '09:00',
        endTime: '17:00',
        label: '',
        areaId: '',
        projectIds: [] as number[],
    });
    const [editState, setEditState] = useState({
        startTime: '',
        endTime: '',
        label: '',
        areaId: '',
        projectIds: [] as number[],
    });

    useEffect(() => {
        const loadSlots = async () => {
            try {
                const [slotsData, areasData, projectsData] = await Promise.all([
                    fetchTimetableSlots(),
                    fetchAreas(),
                    fetchProjects('all', ''),
                ]);
                const safeSlots = Array.isArray(slotsData) ? slotsData : [];
                setSlots(safeSlots);
                setAreas(Array.isArray(areasData) ? areasData : []);
                setProjects(Array.isArray(projectsData) ? projectsData : []);
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

    const areaById = useMemo(() => {
        return areas.reduce<Record<number, Area>>((acc, area) => {
            if (area.id !== undefined) {
                acc[area.id] = area;
            }
            return acc;
        }, {});
    }, [areas]);

    const handleProjectSelection = (
        event: React.ChangeEvent<HTMLSelectElement>,
        onChange: (values: number[]) => void
    ) => {
        const selected = Array.from(event.target.selectedOptions).map((option) =>
            Number(option.value)
        );
        onChange(selected.filter((value) => !Number.isNaN(value)));
    };

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
                label: formState.label || null,
                area_id: formState.areaId
                    ? Number(formState.areaId)
                    : null,
                project_ids: formState.projectIds,
            };
            const created = await createTimetableSlot(payload);
            setSlots((prev) => [...prev, created]);
            setFormState((prev) => ({
                ...prev,
                label: '',
                projectIds: [],
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
        const projectIds = slot.projects
            ? slot.projects.map((project) => project.id)
            : [];
        setEditingSlotId(slot.id || null);
        setEditState({
            startTime: toTime(slot.start_minute),
            endTime: toTime(slot.end_minute),
            label: slot.label || '',
            areaId: slot.area_id ? String(slot.area_id) : '',
            projectIds,
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
                label: editState.label || null,
                area_id: editState.areaId ? Number(editState.areaId) : null,
                project_ids: editState.projectIds,
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
                        'Define work slots for each weekday.'
                    )}
                </p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    {t('timetable.addSlot', 'Add slot')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
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
                    <select
                        value={formState.areaId}
                        onChange={(event) =>
                            setFormState((prev) => ({
                                ...prev,
                                areaId: event.target.value,
                            }))
                        }
                        className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                        <option value="">
                            {t('timetable.area', 'Area (optional)')}
                        </option>
                        {areas.map((area) => (
                            <option key={area.id} value={area.id}>
                                {area.name}
                            </option>
                        ))}
                    </select>
                    <select
                        multiple
                        value={formState.projectIds.map(String)}
                        onChange={(event) =>
                            handleProjectSelection(event, (values) =>
                                setFormState((prev) => ({
                                    ...prev,
                                    projectIds: values,
                                }))
                            )
                        }
                        className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
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
                                                className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            >
                                                {isEditing ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                                                        <select
                                                            value={
                                                                editState.areaId
                                                            }
                                                            onChange={(event) =>
                                                                setEditState(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        areaId:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    })
                                                                )
                                                            }
                                                            className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                                        >
                                                            <option value="">
                                                                {t(
                                                                    'timetable.area',
                                                                    'Area (optional)'
                                                                )}
                                                            </option>
                                                            {areas.map((area) => (
                                                                <option
                                                                    key={
                                                                        area.id
                                                                    }
                                                                    value={
                                                                        area.id
                                                                    }
                                                                >
                                                                    {area.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            multiple
                                                            value={editState.projectIds.map(
                                                                String
                                                            )}
                                                            onChange={(event) =>
                                                                handleProjectSelection(
                                                                    event,
                                                                    (values) =>
                                                                        setEditState(
                                                                            (
                                                                                prev
                                                                            ) => ({
                                                                                ...prev,
                                                                                projectIds:
                                                                                    values,
                                                                            })
                                                                        )
                                                                )
                                                            }
                                                            className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                                                        >
                                                            {projects.map(
                                                                (project) => (
                                                                    <option
                                                                        key={
                                                                            project.id
                                                                        }
                                                                        value={
                                                                            project.id
                                                                        }
                                                                    >
                                                                        {
                                                                            project.name
                                                                        }
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>
                                                        <div className="flex gap-2 md:col-span-5">
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
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-semibold">
                                                                {toTime(
                                                                    slot.start_minute
                                                                )}{' '}
                                                                -{' '}
                                                                {toTime(
                                                                    slot.end_minute
                                                                )}
                                                            </div>
                                                            {slot.label && (
                                                                <div className="text-xs opacity-80">
                                                                    {slot.label}
                                                                </div>
                                                            )}
                                                            {(slot.area_id ||
                                                                slot.projects
                                                                    ?.length) && (
                                                                <div className="text-xs opacity-80">
                                                                    {slot.area_id &&
                                                                        areaById[
                                                                            slot
                                                                                .area_id
                                                                        ]?.name}
                                                                    {slot.area_id &&
                                                                        slot
                                                                            .projects
                                                                            ?.length
                                                                        ? ' · '
                                                                        : ''}
                                                                    {slot.projects
                                                                        ?.map(
                                                                            (
                                                                                project
                                                                            ) =>
                                                                                project.name
                                                                        )
                                                                        .join(
                                                                            ', '
                                                                        )}
                                                                </div>
                                                            )}
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
