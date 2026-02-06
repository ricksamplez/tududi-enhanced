const request = require('supertest');
const moment = require('moment-timezone');
const app = require('../../app');
const {
    Area,
    Project,
    ScheduleEntry,
    Task,
    TimetableSlot,
    UserCalendarToken,
} = require('../../models');
const { createTestUser, authenticateUser } = require('../helpers/testUtils');
const feedTokenService = require('../../modules/calendar/feedTokenService');
const { processDueDateForStorage } = require('../../utils/timezone-utils');

const formatUtcDateTime = (momentDate) =>
    momentDate.utc().format('YYYYMMDDTHHmmss[Z]');

const buildExpectedTimes = (date, startMinute, endMinute) => {
    const start = moment
        .tz(date, 'YYYY-MM-DD', 'UTC')
        .hour(Math.floor(startMinute / 60))
        .minute(startMinute % 60)
        .second(0);
    const duration = endMinute - startMinute;
    const end = start.clone().add(duration, 'minutes');
    return {
        start: formatUtcDateTime(start),
        end: formatUtcDateTime(end),
    };
};

const seedScheduleEntry = async (user) => {
    const targetDate = moment.tz('UTC').startOf('day').add(1, 'day');
    const targetDateString = targetDate.format('YYYY-MM-DD');

    const area = await Area.create({
        name: 'Schedule ICS Area',
        user_id: user.id,
    });
    const project = await Project.create({
        name: 'Schedule ICS Project',
        user_id: user.id,
        area_id: area.id,
    });
    const slot = await TimetableSlot.create({
        user_id: user.id,
        weekday: targetDate.day(),
        start_minute: 540,
        end_minute: 600,
        area_id: area.id,
    });
    await slot.addProject(project);

    const task = await Task.create({
        name: 'Schedule ICS task',
        user_id: user.id,
        project_id: project.id,
        due_date: processDueDateForStorage(targetDateString, 'UTC'),
        due_time_minutes: 600,
        estimated_duration_minutes: 60,
    });

    return { task, targetDateString };
};

describe('Calendar schedule ICS feed', () => {
    it('returns schedule segments in the public feed', async () => {
        const user = await createTestUser({
            email: 'schedule-feed@example.com',
            timezone: 'UTC',
            first_day_of_week: 1,
        });

        const rawToken = feedTokenService.generateToken();
        await UserCalendarToken.create({
            user_id: user.id,
            token_hash: feedTokenService.hashToken(rawToken),
        });

        const { task, targetDateString } = await seedScheduleEntry(user);
        const agent = request.agent(app);
        await authenticateUser(agent, user);
        await agent.get('/api/schedule/day').query({
            date: targetDateString,
        });

        const entry = await ScheduleEntry.findOne({
            where: {
                user_id: user.id,
                task_id: task.id,
                date: targetDateString,
            },
        });

        expect(entry).toBeTruthy();
        const { start, end } = buildExpectedTimes(
            targetDateString,
            entry.start_minute,
            entry.end_minute
        );

        const response = await request(app).get(
            `/api/calendar/feed/${rawToken}/schedule.ics`
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/calendar');
        expect(response.text).toContain(`SUMMARY:${task.name}`);
        expect(response.text).toContain(`DTSTART:${start}`);
        expect(response.text).toContain(`DTEND:${end}`);
    });

    it('returns an authenticated schedule ICS feed', async () => {
        const user = await createTestUser({
            email: 'schedule-auth@example.com',
            timezone: 'UTC',
            first_day_of_week: 1,
        });

        const { targetDateString } = await seedScheduleEntry(user);
        const agent = request.agent(app);
        await authenticateUser(agent, user);
        await agent.get('/api/schedule/day').query({
            date: targetDateString,
        });

        const response = await agent.get('/api/calendar/schedule.ics');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/calendar');
        expect(response.text).toContain('BEGIN:VCALENDAR');
    });
});
