const fs = require('fs-extra');
const path = require('path');

const DATA_DIR          = path.join(__dirname, '../data');
const USERS_FILE        = path.join(DATA_DIR, 'users.json');
const CANDIDATES_FILE   = path.join(DATA_DIR, 'candidates.json');
const PENDING_FILE      = path.join(DATA_DIR, 'pending_users.json');
const SETTINGS_FILE     = path.join(DATA_DIR, 'settings.json');

// Helper to ensure file exists with default content
const ensureFile = async (filePath, defaultContent) => {
    if (!fs.existsSync(filePath)) {
        await fs.ensureDir(DATA_DIR);
        await fs.writeJson(filePath, defaultContent, { spaces: 2 });
    }
};

const readUsers = async () => {
    await ensureFile(USERS_FILE, []);
    return fs.readJson(USERS_FILE);
};

const writeUsers = async (d) => fs.writeJson(USERS_FILE, d, { spaces: 2 });

const readCandidates = async () => {
    await ensureFile(CANDIDATES_FILE, []);
    return fs.readJson(CANDIDATES_FILE);
};

const readPending = async () => {
    await ensureFile(PENDING_FILE, []);
    return fs.readJson(PENDING_FILE);
};

const writePending = async (d) => fs.writeJson(PENDING_FILE, d, { spaces: 2 });

const readSettings = async () => {
    await ensureFile(SETTINGS_FILE, { voting_open: false });
    return fs.readJson(SETTINGS_FILE);
};

const writeSettings = async (d) => fs.writeJson(SETTINGS_FILE, d, { spaces: 2 });

const getUserByUsername = async (username) => {
    const users = await readUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
};

module.exports = {
    readUsers, writeUsers,
    readCandidates,
    readPending, writePending,
    readSettings, writeSettings,
    getUserByUsername
};
