const { readSettings, getUserByUsername } = require('../services/dataService');
const { castVote } = require('../services/voteQueue');
const { sendResponse } = require('../utils/responseHandler');

const vote = async (req, res) => {
    try {
        const settings = await readSettings();
        if (!settings.voting_open) {
            return sendResponse(res, false, 'Voting belum dibuka oleh panitia', {}, 403);
        }

        const { username, pilihan } = req.body;
        if (!username || !pilihan) {
            return sendResponse(res, false, 'Username dan kandidat wajib diisi', {}, 400);
        }

        const user = await getUserByUsername(username);
        if (!user || user.role === 'admin' || user.role === 'admin_verificator') {
            return sendResponse(res, false, 'Akses ditolak: Akun Administrasi tidak diperbolehkan voting.', {}, 403);
        }

        const result = await castVote(username, pilihan);
        return sendResponse(res, true, 'Vote berhasil dicatat', result);

    } catch (error) {
        const status = error.status || 500;
        console.error('[Vote Error]', error.message);
        return sendResponse(res, false, error.message || 'Internal server error', {}, status);
    }
};

module.exports = { vote };
