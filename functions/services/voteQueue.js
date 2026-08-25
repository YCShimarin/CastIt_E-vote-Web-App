/**
 * voteQueue.js — NeDB Version
 * 
 * Queue-based voting processor to prevent race conditions.
 * Now using NeDB for persistence.
 */

const { db, readCandidates } = require('./dataService');

let queue = [];
let isProcessing = false;

const enqueueVote = (username, pilihan, userNama) => {
    return new Promise((resolve, reject) => {
        const entry = {
            username,
            pilihan,
            userNama: (userNama || username).toLowerCase(),
            timestamp: Date.now(),
            resolve,
            reject
        };

        queue.push(entry);
        queue.sort((a, b) => {
            if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
            return a.userNama.localeCompare(b.userNama, 'id');
        });

        console.log(`[Queue] ${username} masuk antrian. Total: ${queue.length}`);
        setImmediate(processQueue);
    });
};

const processQueue = async () => {
    if (isProcessing || queue.length === 0) return;

    isProcessing = true;
    const entry = queue.shift();

    try {
        // Find user in NeDB
        const user = await db.users.findOne({ username: new RegExp(`^${entry.username}$`, 'i') });

        if (!user) throw new Error('User not found');
        if (user.has_voted) throw new Error('Anda sudah memilih sebelumnya');

        const candidates = await readCandidates();
        const candidate = candidates.find(c => c.id === entry.pilihan);
        if (!candidate) throw new Error('Kandidat tidak valid');

        // Atomic update in NeDB
        await db.users.update(
            { _id: user._id },
            { 
                $set: { 
                    has_voted: true, 
                    vote: entry.pilihan, 
                    voted_at: new Date().toISOString() 
                } 
            }
        );

        console.log(`[Vote Success] ${entry.username} memilih ${entry.pilihan}`);
        entry.resolve({ username: entry.username, success: true });
    } catch (err) {
        console.error(`[Vote Failed] ${entry.username}:`, err.message);
        entry.reject(err);
    } finally {
        isProcessing = false;
        if (queue.length > 0) setImmediate(processQueue);
    }
};

const getQueueStatus = () => ({ size: queue.length, isProcessing });

module.exports = { castVote: enqueueVote, getQueueStatus };
