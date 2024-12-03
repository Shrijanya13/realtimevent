const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const events = [];
const completedEventsFile = path.join(__dirname, 'completed_events.json');

function addEvent(title, description, scheduled_time) {
    const now = new Date();
    const eventTime = new Date(scheduled_time);

    if (eventTime <= now) {
        return { error: 'Scheduled time must be in the future.' };
    }

    const event = {
        id: uuidv4(),
        title,
        description,
        scheduled_time,
        status: 'upcoming',
    };

    events.push(event);
    events.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
    return { event };
}

function getUpcomingEvents() {
    const now = new Date();
    return events.filter(event => new Date(event.scheduled_time) > now);
}

function markCompletedEvents() {
    const now = new Date();
    while (events.length && new Date(events[0].scheduled_time) <= now) {
        const completed = events.shift();
        completed.status = 'completed';
        fs.appendFile(completedEventsFile, JSON.stringify(completed) + '\n', (err) => {
            if (err) console.error('Error logging event:', err);
        });
    }
}

module.exports = { addEvent, getUpcomingEvents, markCompletedEvents };
