const request = require('supertest');
const app = require('../../app');
const { Task, UserCalendarToken } = require('../../models');
const { createTestUser, authenticateUser } = require('../helpers/testUtils');
const feedTokenService = require('../../modules/calendar/feedTokenService');

describe('Calendar public feed', () => {
    it('returns an ICS feed without authentication', async () => {
        const user = await createTestUser({
            email: 'public-feed@example.com',
            timezone: 'UTC',
        });

        const rawToken = feedTokenService.generateToken();
        await UserCalendarToken.create({
            user_id: user.id,
            token_hash: feedTokenService.hashToken(rawToken),
        });

        await Task.create({
            name: 'All day public task',
            user_id: user.id,
            due_date: '2026-02-10',
        });

        await Task.create({
            name: 'Timed public task',
            user_id: user.id,
            due_date: '2026-02-11',
            due_time_minutes: 480,
            estimated_duration_minutes: 30,
        });

        const response = await request(app).get(
            `/api/calendar/feed/${rawToken}.ics`
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/calendar');
        expect(response.text).toContain('SUMMARY:All day public task');
        expect(response.text).toContain('SUMMARY:Timed public task');
    });

    it('returns 404 for invalid tokens', async () => {
        const response = await request(app).get(
            '/api/calendar/feed/invalid-token.ics'
        );

        expect(response.status).toBe(404);
    });

    it('manages feed tokens via authenticated endpoints', async () => {
        const user = await createTestUser({
            email: 'token-owner@example.com',
        });
        const agent = request.agent(app);
        await authenticateUser(agent, user);

        const firstResponse = await agent.get('/api/calendar/feed-token');

        expect(firstResponse.status).toBe(200);
        expect(firstResponse.body.exists).toBe(true);
        expect(firstResponse.body.token).toBeTruthy();

        const secondResponse = await agent.get('/api/calendar/feed-token');

        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body.exists).toBe(true);
        expect(secondResponse.body.token).toBeNull();

        const rotateResponse = await agent.post(
            '/api/calendar/feed-token/rotate'
        );

        expect(rotateResponse.status).toBe(200);
        expect(rotateResponse.body.token).toBeTruthy();
        expect(rotateResponse.body.token).not.toEqual(firstResponse.body.token);
    });
});
