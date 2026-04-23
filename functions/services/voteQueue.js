/**
 * voteQueue.js — Local JSON version
 * 
 * Queue-based voting processor to prevent race conditions in Localhost.
 */

const { readUsers, writeUsers, readCandidates } = require('./dataService');

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
        const users = await readUsers();
        const userIndex = users.findIndex(u => u.username.toLowerCase() === entry.username.toLowerCase());

        if (userIndex === -1) throw new Error('User not found');
        if (users[userIndex].has_voted) throw new Error('Anda sudah memilih sebelumnya');

        const candidates = await readCandidates();
        if (!candidates.some(c => c.id === entry.pilihan)) throw new Error('Kandidat tidak valid');

        // Atomic update
        users[userIndex].has_voted = true;
        users[userIndex].vote = entry.pilihan;
        users[userIndex].voted_at = new Date().toISOString();

        await writeUsers(users);
        entry.resolve({ username: entry.username, success: true });
    } catch (err) {
        entry.reject(err);
    } finally {
        isProcessing = false;
        if (queue.length > 0) setImmediate(processQueue);
    }
};

const getQueueStatus = () => ({ size: queue.length, isProcessing });

module.exports = { castVote: enqueueVote, getQueueStatus };
