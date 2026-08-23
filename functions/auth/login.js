const { readUsers, getUserByUsername } = require('../services/dataService');
const { sendResponse } = require('../utils/responseHandler');

const login = async (req, res) => {
    try {
        const { username: rawUsername, password: rawPassword } = req.body;
        const username = rawUsername ? rawUsername.trim() : '';
        const password = rawPassword ? rawPassword.trim() : '';

        if (!username || !password) {
            return sendResponse(res, false, 'Username and password are required', {}, 400);
        }

        const user = await getUserByUsername(username);

        if (!user) {
            return sendResponse(res, false, 'User not found', {}, 404);
        }

        const isMatch = password === user.password;
        
        // Debugging (Akan muncul di terminal Anda)
        if (!isMatch) {
            console.log(`[Login Debug] Mismatch for ${username}:`);
            console.log(`- Input: '${password}' (Length: ${password.length})`);
            console.log(`- DB:    '${user.password}' (Length: ${user.password.length})`);
        }

        if (!isMatch) {
            return sendResponse(res, false, 'Invalid credentials', {}, 401);
        }

        // Session check
        const { db } = require('../services/dataService');
        const activeSession = await db.sessions.findOne({ username: user.username });
        if (activeSession) {
            const now = Date.now();
            // If active in the last 3 minutes, reject
            if (now - activeSession.last_active < 3 * 60 * 1000) {
                return sendResponse(res, false, 'Akun ini sedang login di perangkat lain', {}, 403);
            }
            // Otherwise, old session is dead, remove it
            await db.sessions.remove({ username: user.username }, { multi: true });
        }

        const crypto = require('crypto');
        const sessionToken = crypto.randomBytes(16).toString('hex');
        
        await db.sessions.insert({
            username: user.username,
            token: sessionToken,
            last_active: Date.now()
        });

        // Standard user response (excluding password)
        const userData = {
            username: user.username,
            fullName: user.nama,
            role: user.role || 'user',
            has_voted: user.has_voted,
            vote: user.vote,
            sessionToken: sessionToken
        };

        return sendResponse(res, true, 'Login successful', userData);
    } catch (error) {
        console.error('Login error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

const logout = async (req, res) => {
    try {
        const { sessionToken } = req.body;
        if (sessionToken) {
            const { db } = require('../services/dataService');
            await db.sessions.remove({ token: sessionToken }, { multi: true });
        }
        return sendResponse(res, true, 'Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

const heartbeat = async (req, res) => {
    try {
        const { sessionToken } = req.body;
        if (sessionToken) {
            const { db } = require('../services/dataService');
            await db.sessions.update(
                { token: sessionToken },
                { $set: { last_active: Date.now() } }
            );
        }
        return sendResponse(res, true, 'Heartbeat updated');
    } catch (error) {
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

module.exports = { login, logout, heartbeat };
