const { readUsers, readCandidates, readSettings } = require('../services/dataService');
const { sendResponse } = require('../utils/responseHandler');

const getResults = async (req, res) => {
    try {
        let users = (await readUsers()) || [];
        const candidates = (await readCandidates()) || [];
        const settings = (await readSettings()) || { voting_open: false };

        // Exclude admins from statistics
        users = users.filter(u => u.role !== 'admin' && u.role !== 'admin_verificator');

        const totalUsers = users.length;
        const totalVoted = users.filter(u => u.has_voted).length;
        const notVoted = totalUsers - totalVoted;
        const progressPercentage = totalUsers === 0 ? 0 : Math.round((totalVoted / totalUsers) * 100);

        // Calculate votes per candidate
        const voteCounts = {};
        if (candidates.length > 0) {
            candidates.forEach(c => {
                voteCounts[c.id] = {
                    nama: c.nama,
                    count: 0,
                    percentage: 0
                };
            });

            users.forEach(u => {
                if (u.has_voted && voteCounts[u.vote]) {
                    voteCounts[u.vote].count++;
                }
            });

            // Calculate percentages
            Object.keys(voteCounts).forEach(id => {
                voteCounts[id].percentage = totalVoted === 0 ? 0 : Math.round((voteCounts[id].count / totalVoted) * 100);
            });
        }

        return sendResponse(res, true, 'Results fetched', {
            voting_open: settings.voting_open || false,
            stats: {
                totalUsers,
                totalVoted,
                notVoted,
                progressPercentage
            },
            candidates: candidates,
            voteCounts: voteCounts
        });
    } catch (error) {
        console.error('Results error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

module.exports = { getResults };
