const request = require('supertest');
const app = require('../../app');
const { Task } = require('../../models');
const { createTestUser } = require('../helpers/testUtils');

describe('Calendar ICS export', () => {
    let user;
    let agent;

    beforeEach(async () => {
        user = await createTestUser({
            email: 'ics@example.com',
            timezone: 'UTC',
        });

        agent = request.agent(app);
        await agent.post('/api/login').send({
            email: 'ics@example.com',
            password: 'password123',
        });
    });

    it('returns an ICS file with due date tasks', async () => {
        await Task.create({
            name: 'All day task',
            user_id: user.id,
            due_date: '2026-02-05',
        });

        await Task.create({
            name: 'Timed task',
            user_id: user.id,
            due_date: '2026-02-06',
            due_time_minutes: 600,
            estimated_duration_minutes: 90,
        });

        const response = await agent.get('/api/calendar/ics');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/calendar');
        expect(response.text).toContain('BEGIN:VCALENDAR');
        expect(response.text).toContain('SUMMARY:All day task');
        expect(response.text).toContain('SUMMARY:Timed task');
        expect(response.text).toContain('DTSTART;VALUE=DATE:20260205');
    });

    it('returns a public ICS feed when enabled', async () => {
        await Task.create({
            name: 'Public task',
            user_id: user.id,
            due_date: '2026-02-07',
        });

        const enableResponse = await agent.post('/api/calendar/ics/public');

        expect(enableResponse.status).toBe(200);
        expect(enableResponse.body.enabled).toBe(true);
        expect(enableResponse.body.url).toContain('/api/calendar/ics/public/');

        const publicPath = new URL(enableResponse.body.url).pathname;
        const response = await request(app).get(publicPath);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/calendar');
        expect(response.text).toContain('SUMMARY:Public task');
    });

    it('rotates and disables public ICS feeds', async () => {
        await Task.create({
            name: 'Rotate task',
            user_id: user.id,
            due_date: '2026-02-08',
        });

        const enableResponse = await agent.post('/api/calendar/ics/public');
        const firstPath = new URL(enableResponse.body.url).pathname;

        const rotateResponse = await agent.post(
            '/api/calendar/ics/public/rotate'
        );
        const rotatedPath = new URL(rotateResponse.body.url).pathname;

        expect(rotatedPath).not.toEqual(firstPath);

        const oldFeed = await request(app).get(firstPath);
        expect(oldFeed.status).toBe(404);

        const newFeed = await request(app).get(rotatedPath);
        expect(newFeed.status).toBe(200);

        const disableResponse = await agent.delete('/api/calendar/ics/public');
        expect(disableResponse.body.enabled).toBe(false);

        const disabledFeed = await request(app).get(rotatedPath);
        expect(disabledFeed.status).toBe(404);
    });
});
