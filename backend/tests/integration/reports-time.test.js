const request = require('supertest');
const app = require('../../app');
const { Area, Project, Task } = require('../../models');
const { createTestUser, authenticateUser } = require('../helpers/testUtils');

describe('Time reports', () => {
    it('returns totals and missing data for completed tasks', async () => {
        const user = await createTestUser({
            email: 'reporter@example.com',
            timezone: 'UTC',
        });

        const area = await Area.create({
            name: 'Work',
            user_id: user.id,
        });

        const project = await Project.create({
            name: 'Reporting Project',
            user_id: user.id,
            area_id: area.id,
        });

        await Task.create({
            name: 'Task with estimate and actual',
            user_id: user.id,
            project_id: project.id,
            status: Task.STATUS.DONE,
            estimated_duration_minutes: 60,
            actual_duration_minutes: 90,
            completed_at: new Date('2026-02-05T12:00:00Z'),
        });

        await Task.create({
            name: 'Task missing actual',
            user_id: user.id,
            project_id: project.id,
            status: Task.STATUS.DONE,
            estimated_duration_minutes: 30,
            actual_duration_minutes: null,
            completed_at: new Date('2026-02-06T12:00:00Z'),
        });

        const agent = request.agent(app);
        await authenticateUser(agent, user);

        const response = await agent.get(
            '/api/reports/time?start=2026-02-03&end=2026-02-09'
        );

        expect(response.status).toBe(200);
        expect(response.body.totals.estimated_minutes).toBe(90);
        expect(response.body.totals.actual_minutes).toBe(90);
        expect(response.body.by_project).toHaveLength(1);
        expect(response.body.by_project[0].project_id).toBe(project.id);
        expect(response.body.tasks_missing).toHaveLength(1);
        expect(response.body.tasks_missing[0].missing).toContain('actual');
    });
});
