const request = require('supertest');
const moment = require('moment-timezone');
const app = require('../../app');
const { Area, Project, Task, TimetableSlot } = require('../../models');
const { processDueDateForStorage } = require('../../utils/timezone-utils');
const { createTestUser } = require('../helpers/testUtils');

const flattenSegments = (dayResponse) =>
    dayResponse.items
        .filter((item) => item.type === 'slot')
        .flatMap((item) => item.segments);

const createAreaAndProject = async (userId) => {
    const area = await Area.create({
        name: 'Schedule Split Area',
        user_id: userId,
    });
    const project = await Project.create({
        name: 'Schedule Split Project',
        user_id: userId,
        area_id: area.id,
    });
    return { area, project };
};

const createSlot = async (userId, weekday, start, end, areaId, projectId) => {
    const slot = await TimetableSlot.create({
        user_id: userId,
        weekday,
        start_minute: start,
        end_minute: end,
        area_id: areaId,
    });
    if (projectId) {
        await slot.addProject(projectId);
    }
    return slot;
};

describe('Schedule task splitting', () => {
    let user;
    let agent;

    beforeEach(async () => {
        user = await createTestUser({
            email: 'schedule-splitting@example.com',
            timezone: 'UTC',
            first_day_of_week: 1,
        });

        agent = request.agent(app);
        await agent.post('/api/login').send({
            email: 'schedule-splitting@example.com',
            password: 'password123',
        });
    });

    it('spans across consecutive slots with a pause gap', async () => {
        const today = moment.tz('UTC').startOf('day');
        const targetDate = today.clone().add(1, 'day');
        const targetDateString = targetDate.format('YYYY-MM-DD');
        const { area, project } = await createAreaAndProject(user.id);

        const slot1 = await createSlot(
            user.id,
            targetDate.day(),
            540,
            600,
            area.id,
            project.id
        );
        const slot2 = await createSlot(
            user.id,
            targetDate.day(),
            630,
            690,
            area.id,
            project.id
        );

        const task = await Task.create({
            name: 'Gap span task',
            user_id: user.id,
            project_id: project.id,
            due_date: processDueDateForStorage(targetDateString, 'UTC'),
            due_time_minutes: 690,
            estimated_duration_minutes: 90,
        });

        const response = await agent.get('/api/schedule/day').query({
            date: targetDateString,
        });

        expect(response.status).toBe(200);
        const segments = flattenSegments(response.body)
            .filter((segment) => segment.task_id === task.id)
            .sort((a, b) => a.start_minute - b.start_minute);

        expect(segments).toHaveLength(2);
        expect(segments[0]).toMatchObject({
            start_minute: 540,
            end_minute: 600,
            slot_id: slot1.id,
        });
        expect(segments[1]).toMatchObject({
            start_minute: 630,
            end_minute: 660,
            slot_id: slot2.id,
        });
    });

    it('does not scatter into later non-consecutive slot', async () => {
        const today = moment.tz('UTC').startOf('day');
        const targetDate = today.clone().add(1, 'day');
        const targetDateString = targetDate.format('YYYY-MM-DD');
        const { area, project } = await createAreaAndProject(user.id);

        const slot1 = await createSlot(
            user.id,
            targetDate.day(),
            540,
            600,
            area.id,
            project.id
        );
        const slot2 = await createSlot(
            user.id,
            targetDate.day(),
            630,
            690,
            area.id,
            project.id
        );
        const slot3 = await createSlot(
            user.id,
            targetDate.day(),
            900,
            960,
            area.id,
            project.id
        );

        const task = await Task.create({
            name: 'No scatter task',
            user_id: user.id,
            project_id: project.id,
            due_date: processDueDateForStorage(targetDateString, 'UTC'),
            due_time_minutes: 960,
            estimated_duration_minutes: 90,
        });

        const response = await agent.get('/api/schedule/day').query({
            date: targetDateString,
        });

        expect(response.status).toBe(200);
        const segments = flattenSegments(response.body)
            .filter((segment) => segment.task_id === task.id)
            .sort((a, b) => a.start_minute - b.start_minute);

        expect(segments).toHaveLength(2);
        expect(segments[0]).toMatchObject({
            start_minute: 540,
            end_minute: 600,
            slot_id: slot1.id,
        });
        expect(segments[1]).toMatchObject({
            start_minute: 630,
            end_minute: 660,
            slot_id: slot2.id,
        });
        expect(segments.find((segment) => segment.slot_id === slot3.id)).toBe(
            undefined
        );
    });

    it('marks fragmentation as unassigned without scattering', async () => {
        const today = moment.tz('UTC').startOf('day');
        const targetDate = today.clone().add(1, 'day');
        const targetDateString = targetDate.format('YYYY-MM-DD');
        const { area, project } = await createAreaAndProject(user.id);
        const otherArea = await Area.create({
            name: 'Other Area',
            user_id: user.id,
        });

        await createSlot(
            user.id,
            targetDate.day(),
            540,
            570,
            area.id,
            project.id
        );
        await createSlot(user.id, targetDate.day(), 570, 600, otherArea.id);
        await createSlot(
            user.id,
            targetDate.day(),
            600,
            630,
            area.id,
            project.id
        );

        await Task.create({
            name: 'Fragmented task',
            user_id: user.id,
            project_id: project.id,
            due_date: processDueDateForStorage(targetDateString, 'UTC'),
            due_time_minutes: 660,
            estimated_duration_minutes: 50,
        });

        const response = await agent.get('/api/schedule/day').query({
            date: targetDateString,
        });

        expect(response.status).toBe(200);
        const unassigned = response.body.unassignedEligible.find(
            (entry) => entry.name === 'Fragmented task'
        );

        expect(unassigned).toBeDefined();
        expect(unassigned.reason_code).toBe('SLOT_FRAGMENTATION_TOO_SMALL');
    });
});
