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

        // Standard user response (excluding password)
        const userData = {
            username: user.username,
            fullName: user.nama,
            role: (user.username.toLowerCase() === 'admin') ? 'admin' : (user.role || 'user'),
            has_voted: user.has_voted,
            vote: user.vote
        };

        return sendResponse(res, true, 'Login successful', userData);
    } catch (error) {
        console.error('Login error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

module.exports = { login };
