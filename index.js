const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const cron = require('node-cron');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

let events = [];

// WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.send(JSON.stringify({ message: 'Connected to Real-Time Notifier' }));

    ws.on('message', (msg) => {
        console.log('Received from client:', msg);
    });
});

// Add Event (POST /events)
app.post('/events', (req, res) => {
    const { title, description, scheduled_time } = req.body;

    if (!title || !description || !scheduled_time) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const event = {
        id: Date.now().toString(),
        title,
        description,
        scheduled_time,
        status: 'upcoming'
    };
    events.push(event);
    res.status(201).json(event);
});

// Get Events (GET /events)
app.get('/events', (req, res) => {
    console.log('Events array:', events); // Check if events array has data
    const upcomingEvents = events.filter(event => event.status === 'upcoming');
    res.json(upcomingEvents);
});


// Function to notify upcoming events
function notifyUpcomingEvents() {
    const now = new Date();
    events.forEach(event => {
        const eventTime = new Date(event.scheduled_time);
        if (eventTime - now <= 5 * 60 * 1000 && event.status === 'upcoming') {
            event.status = 'notified';
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ event }));
                }
            });
        }
    });
}

// Function to log completed events
function logCompletedEvent(event) {
    fs.appendFile('completed_events.log', JSON.stringify(event) + '\n', (err) => {
        if (err) throw err;
        console.log('Logged completed event to file');
    });
}

// Function to mark completed events
function markCompletedEvents() {
    const now = new Date();
    events.forEach(event => {
        const eventTime = new Date(event.scheduled_time);
        if (event.status === 'notified' && eventTime <= now) {
            event.status = 'completed';
            logCompletedEvent(event);
        }
    });
}

// Schedule cron job to check for upcoming events and completed events
cron.schedule('* * * * *', () => {
    console.log('Checking for upcoming events...');
    notifyUpcomingEvents();
    markCompletedEvents();
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
