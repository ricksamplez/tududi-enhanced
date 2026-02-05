const { Project, Task } = require('../../../models');
const permissionsService = require('../../../services/permissionsService');

async function validateProjectAccess(projectId, userId) {
    if (!projectId || !projectId.toString().trim()) {
        return null;
    }

    const project = await Project.findOne({ where: { id: projectId } });
    if (!project) {
        throw new Error('Invalid project.');
    }

    const projectAccess = await permissionsService.getAccess(
        userId,
        'project',
        project.uid
    );
    const isOwner = project.user_id === userId;
    const canWrite =
        isOwner || projectAccess === 'rw' || projectAccess === 'admin';

    if (!canWrite) {
        throw new Error('Forbidden');
    }

    return projectId;
}

async function validateParentTaskAccess(parentTaskId, userId) {
    if (!parentTaskId || !parentTaskId.toString().trim()) {
        return null;
    }

    const parentTask = await Task.findOne({
        where: { id: parentTaskId, user_id: userId },
    });
    if (!parentTask) {
        throw new Error('Invalid parent task.');
    }

    const parentAccess = await permissionsService.getAccess(
        userId,
        'task',
        parentTask.uid
    );
    const isOwner = parentTask.user_id === userId;
    const canWrite =
        isOwner || parentAccess === 'rw' || parentAccess === 'admin';

    if (!canWrite) {
        throw new Error('Invalid parent task.');
    }

    return parentTaskId;
}

function validateDeferUntilAndDueDate(deferUntil, dueDate) {
    // Both must be present to validate
    if (!deferUntil || !dueDate) {
        return;
    }

    const deferDate = new Date(deferUntil);
    const dueDateObj = new Date(dueDate);

    // Check if dates are valid
    if (isNaN(deferDate.getTime()) || isNaN(dueDateObj.getTime())) {
        return;
    }

    // Defer until must be before or equal to due date
    if (deferDate > dueDateObj) {
        throw new Error('Defer until date cannot be after the due date.');
    }
}

function validateDueTimeMinutes(dueTimeMinutes) {
    if (dueTimeMinutes === undefined || dueTimeMinutes === null) {
        return;
    }

    if (!Number.isInteger(dueTimeMinutes)) {
        throw new Error('Due time must be a whole number of minutes.');
    }

    if (dueTimeMinutes < 0 || dueTimeMinutes > 1439) {
        throw new Error('Due time must be between 0 and 1439 minutes.');
    }
}

function validateEstimatedDurationMinutes(estimatedDurationMinutes) {
    if (
        estimatedDurationMinutes === undefined ||
        estimatedDurationMinutes === null
    ) {
        return;
    }

    if (!Number.isInteger(estimatedDurationMinutes)) {
        throw new Error(
            'Estimated duration must be a whole number of minutes.'
        );
    }

    if (estimatedDurationMinutes < 1 || estimatedDurationMinutes > 1440) {
        throw new Error(
            'Estimated duration must be between 1 and 1440 minutes.'
        );
    }
}

function validateActualDurationMinutes(actualDurationMinutes) {
    if (actualDurationMinutes === undefined || actualDurationMinutes === null) {
        return;
    }

    if (!Number.isInteger(actualDurationMinutes)) {
        throw new Error('Actual duration must be a whole number of minutes.');
    }

    if (actualDurationMinutes < 1 || actualDurationMinutes > 1440) {
        throw new Error('Actual duration must be between 1 and 1440 minutes.');
    }
}

module.exports = {
    validateProjectAccess,
    validateParentTaskAccess,
    validateDeferUntilAndDueDate,
    validateDueTimeMinutes,
    validateEstimatedDurationMinutes,
    validateActualDurationMinutes,
};
