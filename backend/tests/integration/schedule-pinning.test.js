const request = require('supertest');
const moment = require('moment-timezone');
const app = require('../../app');
const {
    Area,
    Project,
    ScheduleDay,
    ScheduleEntry,
    Task,
    TimetableSlot,
} = require('../../models');
const { processDueDateForStorage } = require('../../utils/timezone-utils');
const { createTestUser } = require('../helpers/testUtils');

const flattenSegments = (dayResponse) =>
    dayResponse.items
        .filter((item) => item.type === 'slot')
        .flatMap((item) => item.segments);

const createAreaProjectSlot = async (userId, dateMoment) => {
    const area = await Area.create({
        name: 'Schedule Area',
        user_id: userId,
    });
    const project = await Project.create({
        name: 'Schedule Project',
        user_id: userId,
        area_id: area.id,
    });
    const slot = await TimetableSlot.create({
        user_id: userId,
        weekday: dateMoment.day(),
        start_minute: 0,
        end_minute: 120,
        area_id: area.id,
    });
    await slot.addProject(project);
    return { area, project, slot };
};

describe('Schedule pinning', () => {
    let user;
    let agent;

    beforeEach(async () => {
        user = await createTestUser({
            email: 'schedule-pinning@example.com',
            timezone: 'UTC',
            first_day_of_week: 1,
        });

        agent = request.agent(app);
        await agent.post('/api/login').send({
            email: 'schedule-pinning@example.com',
            password: 'password123',
        });
    });

    it('preserves pinned entries during future replans', async () => {
        const today = moment.tz('UTC').startOf('day');
        const futureDate = today.clone().add(1, 'day');
        const futureDateString = futureDate.format('YYYY-MM-DD');

        const { project } = await createAreaProjectSlot(
            user.id,
            futureDate
        );

        const task = await Task.create({
            name: 'Pinned work',
            user_id: user.id,
            project_id: project.id,
            due_date: processDueDateForStorage(futureDateString, 'UTC'),
            due_time_minutes: 120,
            estimated_duration_minutes: 60,
        });

        const initialResponse = await agent.get('/api/schedule/day').query({
            date: futureDateString,
        });

        expect(initialResponse.status).toBe(200);
        const initialSegments = flattenSegments(initialResponse.body);
        expect(initialSegments.length).toBeGreaterThan(0);

        const targetSegment = initialSegments.find(
            (segment) => segment.task_id === task.id
        );
        expect(targetSegment).toBeDefined();

        const pinResponse = await agent
            .patch(`/api/schedule/entries/${targetSegment.entry_id}`)
            .send({ pinned: true });

        expect(pinResponse.status).toBe(200);

        await ScheduleDay.update(
            { dirty: true, dirty_reason: 'test' },
            { where: { user_id: user.id, date: futureDateString } }
        );

        const refreshedResponse = await agent.get('/api/schedule/day').query({
            date: futureDateString,
        });

        expect(refreshedResponse.status).toBe(200);
        const refreshedSegments = flattenSegments(refreshedResponse.body);
        const pinnedSegment = refreshedSegments.find(
            (segment) => segment.entry_id === targetSegment.entry_id
        );

        expect(pinnedSegment).toBeDefined();
        expect(pinnedSegment.start_minute).toBe(targetSegment.start_minute);
        expect(pinnedSegment.end_minute).toBe(targetSegment.end_minute);
        expect(pinnedSegment.slot_id).toBe(targetSegment.slot_id);
    });

    it('uses pinned duration to avoid duplicate scheduling', async () => {
        const today = moment.tz('UTC').startOf('day');
        const futureDate = today.clone().add(2, 'day');
        const futureDateString = futureDate.format('YYYY-MM-DD');

        const { project, slot } = await createAreaProjectSlot(
            user.id,
            futureDate
        );

        const task = await Task.create({
            name: 'Partial pinned work',
            user_id: user.id,
            project_id: project.id,
            due_date: processDueDateForStorage(futureDateString, 'UTC'),
            due_time_minutes: 120,
            estimated_duration_minutes: 60,
        });

        await ScheduleEntry.create({
            user_id: user.id,
            date: futureDateString,
            start_minute: 0,
            end_minute: 30,
            task_id: task.id,
            slot_id: slot.id,
            pinned: true,
        });

        await ScheduleDay.create({
            user_id: user.id,
            date: futureDateString,
            timezone: 'UTC',
            dirty: true,
        });

        const response = await agent.get('/api/schedule/day').query({
            date: futureDateString,
        });

        expect(response.status).toBe(200);
        const segments = flattenSegments(response.body).filter(
            (segment) => segment.task_id === task.id
        );
        const totalMinutes = segments.reduce(
            (sum, segment) => sum + (segment.end_minute - segment.start_minute),
            0
        );

        expect(totalMinutes).toBe(60);
    });
});
