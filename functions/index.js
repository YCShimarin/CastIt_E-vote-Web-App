const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { login, logout, heartbeat } = require('./auth/login');
const { vote } = require('./routes/vote');
const { getResults } = require('./routes/results');
const { submitHelpdesk } = require('./routes/helpdesk');
const { getStatus, toggleVoting, doAdminAction, getUsersList } = require('./routes/admin');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Secure config serving (hides admin credentials)
app.get('/web_config.json', (req, res) => {
    try {
        const fs = require('fs');
        const configPath = path.join(__dirname, '../web_config.json');
        const configStr = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configStr);
        delete config.admin; // Remove sensitive data
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: 'Config not found' });
    }
});

// Serve Static Files from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.post('/auth/login', login);
app.post('/auth/logout', logout);
app.post('/auth/heartbeat', heartbeat);
app.post('/vote', vote);
app.get('/result', getResults);
app.post('/helpdesk', submitHelpdesk);
app.get('/admin/status', getStatus);
app.post('/admin/toggle-voting', toggleVoting);
app.get('/admin/users', getUsersList);
app.post('/admin/action', doAdminAction);
app.get('/admin/queue', (req, res) => {
    res.json({ success: true, message: 'Queue status', data: getQueueStatus() });
});

// 404 Handler (Ensure we always return JSON instead of HTML)
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Endpoint ${req.method} ${req.url} tidak ditemukan`, data: {} });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message, data: {} });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log(`  VOTING SERVER IS RUNNING`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log('=========================================');
});
