const request = require('supertest');
const app = require('../../app');
const { Area, Project, TimetableSlot } = require('../../models');
const { createTestUser } = require('../helpers/testUtils');

describe('Timetable Routes', () => {
    let user;
    let agent;

    beforeEach(async () => {
        user = await createTestUser({
            email: 'timetable@example.com',
        });

        agent = request.agent(app);
        await agent.post('/api/login').send({
            email: 'timetable@example.com',
            password: 'password123',
        });
    });

    it('creates and updates timetable slots with area and projects', async () => {
        const area = await Area.create({
            name: 'Deep Work',
            user_id: user.id,
        });
        const projectA = await Project.create({
            name: 'Project A',
            user_id: user.id,
        });
        const projectB = await Project.create({
            name: 'Project B',
            user_id: user.id,
        });

        const createResponse = await agent.post('/api/timetable/slots').send({
            weekday: 2,
            start_minute: 540,
            end_minute: 600,
            label: 'Focus',
            area_id: area.id,
            project_ids: [projectA.id, projectB.id],
        });

        expect(createResponse.status).toBe(201);
        expect(createResponse.body.area_id).toBe(area.id);
        expect(createResponse.body.projects).toHaveLength(2);

        const updateResponse = await agent
            .patch(`/api/timetable/slots/${createResponse.body.id}`)
            .send({
                area_id: null,
                project_ids: [],
                label: 'Focus 2',
            });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.area_id).toBe(null);
        expect(updateResponse.body.projects).toHaveLength(0);

        const listResponse = await agent.get('/api/timetable/slots');
        expect(listResponse.status).toBe(200);
        expect(listResponse.body).toHaveLength(1);
        expect(listResponse.body[0].label).toBe('Focus 2');
    });

    it('rejects projects that do not belong to the user', async () => {
        const otherUser = await createTestUser({
            email: 'other@example.com',
        });
        const foreignProject = await Project.create({
            name: 'Foreign',
            user_id: otherUser.id,
        });

        const response = await agent.post('/api/timetable/slots').send({
            weekday: 2,
            start_minute: 540,
            end_minute: 600,
            project_ids: [foreignProject.id],
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('One or more projects not found.');

        const slots = await TimetableSlot.findAll({
            where: { user_id: user.id },
        });
        expect(slots).toHaveLength(0);
    });
});
