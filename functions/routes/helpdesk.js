const { readPending, writePending } = require('../services/dataService');
const { sendResponse } = require('../utils/responseHandler');

const submitHelpdesk = async (req, res) => {
    try {
        const { fullName, idNumber, batch, email, category } = req.body;

        if (!fullName || !idNumber || !batch || !email || !category) {
            return sendResponse(res, false, 'All fields are required', {}, 400);
        }

        const { db } = require('../services/dataService');
        
        // Cek apakah ID Number atau Email sudah terdaftar di daftar anggota aktif (users.db)
        const userExists = await db.users.findOne({ $or: [{ idNumber }, { email }] });
        if (userExists) {
            if (userExists.idNumber === idNumber) {
                return sendResponse(res, false, 'You are already on the list of this election (ID Number registered).', {}, 400);
            }
            if (userExists.email === email) {
                return sendResponse(res, false, 'You are already on the list of this election (Email registered).', {}, 400);
            }
        }

        // Cek duplikat ID Number atau Email di antrean pendaftaran (pending_users.db)
        const pendingExists = await db.pending_users.findOne({ $or: [{ idNumber }, { email }] });
        if (pendingExists) {
            if (pendingExists.idNumber === idNumber) {
                return sendResponse(res, false, 'Your ID Number is currently in the verification queue.', {}, 400);
            }
            if (pendingExists.email === email) {
                return sendResponse(res, false, 'Your Email is currently in the verification queue.', {}, 400);
            }
        }

        const newEntry = {
            id: Date.now(),
            fullName,
            idNumber,
            batch,
            email,
            category,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        await db.pending_users.insert(newEntry);

        return sendResponse(res, true, 'Your registration has been submitted. We will contact you via email once verification is complete.', { id: newEntry.id });
    } catch (error) {
        console.error('Helpdesk error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

module.exports = { submitHelpdesk };
