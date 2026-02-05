const request = require('supertest');
const moment = require('moment-timezone');
const app = require('../../app');
const {
    ScheduleDay,
    ScheduleEntry,
    Task,
    TimetableSlot,
} = require('../../models');
const { createTestUser } = require('../helpers/testUtils');

describe('Schedule dirty tracking', () => {
    let user;
    let agent;

    beforeEach(async () => {
        user = await createTestUser({
            email: 'schedule-dirty@example.com',
            timezone: 'UTC',
            first_day_of_week: 1,
        });

        agent = request.agent(app);
        await agent.post('/api/login').send({
            email: 'schedule-dirty@example.com',
            password: 'password123',
        });
    });

    it('marks a day dirty when due_time_minutes changes', async () => {
        const today = moment.tz('UTC').startOf('day');
        const dueDate = today.clone().add(1, 'day').format('YYYY-MM-DD');

        const createResponse = await agent.post('/api/task').send({
            name: 'Time shift',
            due_date: dueDate,
            due_time_minutes: 600,
            estimated_duration_minutes: 60,
        });

        expect(createResponse.status).toBe(201);

        await ScheduleDay.update(
            { dirty: false, dirty_reason: null },
            { where: { user_id: user.id, date: dueDate } }
        );

        const updateResponse = await agent
            .patch(`/api/task/${createResponse.body.uid}`)
            .send({ due_time_minutes: 660 });

        expect(updateResponse.status).toBe(200);

        const day = await ScheduleDay.findOne({
            where: { user_id: user.id, date: dueDate },
        });

        expect(day.dirty).toBe(true);
    });

    it('marks old and new due_date days dirty on due_date change', async () => {
        const today = moment.tz('UTC').startOf('day');
        const oldDate = today.clone().add(1, 'day').format('YYYY-MM-DD');
        const newDate = today.clone().add(2, 'day').format('YYYY-MM-DD');

        const createResponse = await agent.post('/api/task').send({
            name: 'Move date',
            due_date: oldDate,
            due_time_minutes: 540,
            estimated_duration_minutes: 30,
        });

        expect(createResponse.status).toBe(201);

        await ScheduleDay.update(
            { dirty: false, dirty_reason: null },
            { where: { user_id: user.id, date: oldDate } }
        );
        await ScheduleDay.update(
            { dirty: false, dirty_reason: null },
            { where: { user_id: user.id, date: newDate } }
        );

        const updateResponse = await agent
            .patch(`/api/task/${createResponse.body.uid}`)
            .send({ due_date: newDate });

        expect(updateResponse.status).toBe(200);

        const oldDay = await ScheduleDay.findOne({
            where: { user_id: user.id, date: oldDate },
        });
        const newDay = await ScheduleDay.findOne({
            where: { user_id: user.id, date: newDate },
        });

        expect(oldDay.dirty).toBe(true);
        expect(newDay.dirty).toBe(true);
    });

    it('does not mark today dirty when completing a past-scheduled task', async () => {
        const today = moment.tz('UTC').startOf('day');
        const todayDate = today.format('YYYY-MM-DD');

        const task = await Task.create({
            name: 'Past scheduled',
            user_id: user.id,
            due_date: todayDate,
            due_time_minutes: 60,
            estimated_duration_minutes: 30,
        });

        await ScheduleDay.create({
            user_id: user.id,
            date: todayDate,
            dirty: false,
            timezone: 'UTC',
        });

        const slot = await TimetableSlot.create({
            user_id: user.id,
            weekday: today.day(),
            start_minute: 0,
            end_minute: 60,
        });

        await ScheduleEntry.create({
            user_id: user.id,
            date: todayDate,
            start_minute: 0,
            end_minute: 1,
            task_id: task.id,
            slot_id: slot.id,
        });

        const updateResponse = await agent
            .patch(`/api/task/${task.uid}`)
            .send({ status: 'done' });

        expect(updateResponse.status).toBe(200);

        const day = await ScheduleDay.findOne({
            where: { user_id: user.id, date: todayDate },
        });

        expect(day.dirty).toBe(false);
    });
});
