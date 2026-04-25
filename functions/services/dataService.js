const Datastore = require('nedb-promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Initialize Datastores
const db = {
    users: Datastore.create({ filename: path.join(DATA_DIR, 'users.db'), autoload: true }),
    candidates: Datastore.create({ filename: path.join(DATA_DIR, 'candidates.db'), autoload: true }),
    pending: Datastore.create({ filename: path.join(DATA_DIR, 'pending_users.db'), autoload: true }),
    settings: Datastore.create({ filename: path.join(DATA_DIR, 'settings.db'), autoload: true })
};

// Indexing for performance
db.users.ensureIndex({ fieldName: 'username', unique: true });
db.users.ensureIndex({ fieldName: 'nim', unique: false });

const readUsers = async () => db.users.find({});
const writeUsers = async (data) => {
    // Note: In NeDB, we usually don't overwrite the whole collection like JSON.
    // This helper is for compatibility during migration or bulk ops.
    await db.users.remove({}, { multi: true });
    return db.users.insert(data);
};

const readCandidates = async () => db.candidates.find({});

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
    return db.users.findOne({ username: new RegExp(`^${username}$`, 'i') });
};

module.exports = {
    db, // Export raw db for advanced queries
    readUsers, writeUsers,
    readCandidates,
    readPending, writePending,
    readSettings, writeSettings,
    getUserByUsername
};
