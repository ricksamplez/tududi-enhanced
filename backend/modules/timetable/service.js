'use strict';

const timetableRepository = require('./repository');
const { validateSlotPayload } = require('./validation');
const { Area, Project } = require('../../models');
const { NotFoundError, ValidationError } = require('../../shared/errors');

const normalizeProjectIds = (projectIds) => {
    if (projectIds === undefined) {
        return null;
    }
    if (!Array.isArray(projectIds)) {
        throw new ValidationError('Project ids must be an array.');
    }
    const normalized = projectIds
        .filter((value) => value !== null && value !== undefined)
        .map((value) => Number(value));
    if (normalized.some((value) => Number.isNaN(value))) {
        throw new ValidationError('Project ids must be numbers.');
    }
    return Array.from(new Set(normalized));
};

const ensureAreaOwnership = async (userId, areaId) => {
    if (areaId === null || areaId === undefined) {
        return null;
    }
    const normalized = Number(areaId);
    if (Number.isNaN(normalized)) {
        throw new ValidationError('Area id must be a number.');
    }
    const area = await Area.findOne({
        where: { id: normalized, user_id: userId },
    });
    if (!area) {
        throw new ValidationError('Area not found.');
    }
    return normalized;
};

const ensureProjectOwnership = async (userId, projectIds) => {
    if (projectIds === null) {
        return null;
    }
    if (projectIds.length === 0) {
        return [];
    }
    const projects = await Project.findAll({
        where: { id: projectIds, user_id: userId },
    });
    if (projects.length !== projectIds.length) {
        throw new ValidationError('One or more projects not found.');
    }
    return projectIds;
};

class TimetableService {
    async list(userId, filters = {}) {
        return timetableRepository.findAllByUser(userId, filters);
    }

    async create(userId, payload) {
        validateSlotPayload(payload);
        const areaId = await ensureAreaOwnership(userId, payload.area_id);
        const projectIds = normalizeProjectIds(payload.project_ids);
        const normalizedProjectIds = await ensureProjectOwnership(
            userId,
            projectIds
        );

        const slot = await timetableRepository.create({
            weekday: payload.weekday,
            start_minute: payload.start_minute,
            end_minute: payload.end_minute,
            label: payload.label,
            area_id: areaId,
            user_id: userId,
        });
        if (normalizedProjectIds) {
            await slot.setProjects(normalizedProjectIds);
        }
        return timetableRepository.findByIdAndUser(slot.id, userId);
    }

    async update(userId, id, payload) {
        const slot = await timetableRepository.findByIdAndUser(id, userId);
        if (!slot) {
            throw new NotFoundError('Timetable slot not found.');
        }

        validateSlotPayload({
            weekday: payload.weekday ?? slot.weekday,
            start_minute: payload.start_minute ?? slot.start_minute,
            end_minute: payload.end_minute ?? slot.end_minute,
        });

        const areaId =
            payload.area_id === undefined
                ? slot.area_id
                : await ensureAreaOwnership(userId, payload.area_id);
        const projectIds = normalizeProjectIds(payload.project_ids);
        const normalizedProjectIds = await ensureProjectOwnership(
            userId,
            projectIds
        );

        await timetableRepository.update(slot, {
            weekday: payload.weekday ?? slot.weekday,
            start_minute: payload.start_minute ?? slot.start_minute,
            end_minute: payload.end_minute ?? slot.end_minute,
            label: payload.label ?? slot.label,
            area_id: areaId,
        });
        if (normalizedProjectIds !== null) {
            await slot.setProjects(normalizedProjectIds);
        }
        return timetableRepository.findByIdAndUser(slot.id, userId);
    }

    async delete(userId, id) {
        const slot = await timetableRepository.findByIdAndUser(id, userId);
        if (!slot) {
            throw new NotFoundError('Timetable slot not found.');
        }
        await timetableRepository.destroy(slot);
    }
}

module.exports = new TimetableService();
