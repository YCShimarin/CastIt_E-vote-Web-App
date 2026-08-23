const Datastore = require('nedb-promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Initialize Datastores
const db = {
    users: Datastore.create({ filename: path.join(DATA_DIR, 'users.db'), autoload: true }),
    candidates: Datastore.create({ filename: path.join(DATA_DIR, 'candidates.db'), autoload: true }),
    pending: Datastore.create({ filename: path.join(DATA_DIR, 'pending_users.db'), autoload: true }),
    settings: Datastore.create({ filename: path.join(DATA_DIR, 'settings.db'), autoload: true }),
    logs: Datastore.create({ filename: path.join(DATA_DIR, 'logs.db'), autoload: true }),
    sessions: Datastore.create({ filename: path.join(DATA_DIR, 'sessions.db'), autoload: true })
};

// Indexing for performance
db.users.ensureIndex({ fieldName: 'username', unique: true });
db.users.ensureIndex({ fieldName: 'nim', unique: false });
db.logs.ensureIndex({ fieldName: 'time' });

const writeLog = async (user, action) => {
    try {
        await db.logs.insert({
            user: user,
            action: action,
            time: new Date().toISOString()
        });
    } catch (e) {
        console.error('Failed to write log:', e);
    }
};

const readLogs = async (limit = 50) => {
    return db.logs.find({}).sort({ time: -1 }).limit(limit);
};

const readUsers = async () => db.users.find({}).sort({ id: 1 });
const writeUsers = async (data) => {
    // Note: In NeDB, we usually don't overwrite the whole collection like JSON.
    // This helper is for compatibility during migration or bulk ops.
    await db.users.remove({}, { multi: true });
    return db.users.insert(data);
};

const fs = require('fs');
const readCandidates = async () => {
    try {
        const configPath = path.join(__dirname, '../../web_config.json');
        const configStr = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configStr);
        return config.candidates.list.map(c => ({
            id: `kandidat_${c.id}`,
            nama: c.name,
            deskripsi: c.description,
            foto: c.image_path,
            visi: c.visi || 'Visi belum tersedia di konfigurasi.',
            misi: c.misi || []
        }));
    } catch (e) {
        console.error('Error reading candidates from web config:', e);
        return [];
    }
};
const readPending = async () => db.pending.find({});
const writePending = async (data) => {
    await db.pending.remove({}, { multi: true });
    return db.pending.insert(data);
};

const readSettings = async () => {
    const settings = await db.settings.findOne({ type: 'global' });
    return settings || { voting_open: false };
};

const writeSettings = async (data) => {
    return db.settings.update(
        { type: 'global' },
        { $set: { ...data, type: 'global' } },
        { upsert: true }
    );
};

const getUserByUsername = async (username) => {
    try {
        const configPath = path.join(__dirname, '../../web_config.json');
        const configStr = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configStr);
        if (config.admin && config.admin.accounts) {
            const adminAcc = config.admin.accounts.find(a => a.username.toLowerCase() === username.toLowerCase());
            if (adminAcc) {
                return {
                    username: adminAcc.username,
                    password: adminAcc.password,
                    nama: adminAcc.username,
                    role: adminAcc.role === 'verificator' ? 'admin_verificator' : 'admin',
                    jurusan: adminAcc.category
                };
            }
        }
    } catch (e) {
        console.error('Failed to check admin in config:', e);
    }
    return db.users.findOne({ username: new RegExp(`^${username}$`, 'i') });
};

module.exports = {
    db, // Export raw db for advanced queries
    readUsers, writeUsers,
    readCandidates,
    readPending, writePending,
    readSettings, writeSettings,
    getUserByUsername,
    writeLog, readLogs
};
