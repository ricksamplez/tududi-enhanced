const request = require('supertest');
const app = require('../../app');
const { Task, TimetableSlot } = require('../../models');
const { createTestUser } = require('../helpers/testUtils');

describe('Planning Routes', () => {
    let user;
    let agent;

    beforeEach(async () => {
        user = await createTestUser({
            email: 'planning@example.com',
            timezone: 'UTC',
        });

        agent = request.agent(app);
        await agent.post('/api/login').send({
            email: 'planning@example.com',
            password: 'password123',
        });
    });

    describe('GET /api/planning/week', () => {
        it('should return week plan with overload and unassigned tasks', async () => {
            await TimetableSlot.create({
                user_id: user.id,
                weekday: 1,
                start_minute: 540,
                end_minute: 1020,
            });

            await TimetableSlot.create({
                user_id: user.id,
                weekday: 2,
                start_minute: 540,
                end_minute: 1020,
            });

            await Task.create({
                name: 'Tuesday task 1',
                user_id: user.id,
                due_date: '2026-02-03',
                estimated_duration_minutes: 240,
            });

            await Task.create({
                name: 'Tuesday task 2',
                user_id: user.id,
                due_date: '2026-02-03',
                estimated_duration_minutes: 300,
            });

            await Task.create({
                name: 'Unassigned task',
                user_id: user.id,
            });

            await Task.create({
                name: 'Future task',
                user_id: user.id,
                due_date: '2026-02-10',
                estimated_duration_minutes: 30,
            });

            const response = await agent.get(
                '/api/planning/week?start=2026-02-02'
            );

            expect(response.status).toBe(200);
            expect(response.body.days).toHaveLength(7);
            expect(response.body.start_date).toBe('2026-02-02');
            expect(response.body.end_date).toBe('2026-02-08');

            const tuesdayPlan = response.body.days.find(
                (day) => day.date === '2026-02-03'
            );
            expect(tuesdayPlan.capacity_minutes).toBe(480);
            expect(tuesdayPlan.planned_minutes).toBe(540);
            expect(tuesdayPlan.overload_minutes).toBe(60);
            expect(tuesdayPlan.tasks).toHaveLength(2);

            expect(response.body.unassigned_tasks).toHaveLength(2);
            expect(response.body.unassigned_minutes).toBe(90);
        });
    });
});
