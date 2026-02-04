import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Area } from '../../entities/Area';
import { useTranslation } from 'react-i18next';
import { updateArea } from '../../utils/areasService';
import { useToast } from '../Shared/ToastContext';

const AreaDetails: React.FC = () => {
    const { t } = useTranslation();
    const { showSuccessToast, showErrorToast } = useToast();
    const { id } = useParams<{ id: string }>();
    const { areas } = useStore((state: any) => state.areasStore);
    const [area, setArea] = useState<Area | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [editedColor, setEditedColor] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!areas.length) setIsLoading(true);
        const foundArea = areas.find((a: Area) => a.id === Number(id));
        setArea(foundArea || null);
        setEditedColor(foundArea?.color || '');
        if (!foundArea) {
            setIsError(true);
        }
        setIsLoading(false);
    }, [id, areas]);

    const handleSaveColor = async () => {
        if (!area?.uid) return;
        if ((area.color || '') === (editedColor || '')) return;
        try {
            setIsSaving(true);
            const updated = await updateArea(area.uid, {
                color: editedColor || null,
            });
            const currentAreas = useStore.getState().areasStore.areas;
            useStore
                .getState()
                .areasStore.setAreas(
                    currentAreas.map((item: Area) =>
                        item.uid === updated.uid ? updated : item
                    )
                );
            setArea(updated);
            showSuccessToast(
                t('areas.colorUpdated', 'Area color updated')
            );
        } catch (error) {
            console.error('Failed to update area color:', error);
            showErrorToast(
                t('areas.colorUpdateError', 'Failed to update area color')
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                    {t('areas.loading')}
                </div>
            </div>
        );
    }

    if (isError || !area) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-red-500 text-lg">
                    {isError ? t('areas.error') : t('areas.notFound')}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('areas.details')}: {area?.name}
                </h2>
                <p className="text-md text-gray-700 dark:text-gray-300">
                    {area?.description}
                </p>
                <div className="mt-4">
                    <label
                        htmlFor="area-detail-color"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        {t('areas.color', 'Area color')}
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            id="area-detail-color"
                            type="color"
                            value={editedColor || '#cccccc'}
                            onChange={(event) =>
                                setEditedColor(event.target.value)
                            }
                            className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                        />
                        <input
                            type="text"
                            value={editedColor}
                            onChange={(event) =>
                                setEditedColor(event.target.value)
                            }
                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                            placeholder="#RRGGBB"
                        />
                        <button
                            type="button"
                            onClick={handleSaveColor}
                            disabled={isSaving}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSaving
                                ? t('common.saving', 'Saving...')
                                : t('common.save', 'Save')}
                        </button>
                    </div>
                </div>
                <Link
                    to={`/projects?area_id=${area?.id}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline mt-4 block"
                >
                    {t('areas.viewProjects', { name: area?.name })}
                </Link>
            </div>
        </div>
    );
};

export default AreaDetails;
