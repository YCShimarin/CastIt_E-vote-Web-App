const { readPending, writePending } = require('../services/dataService');
const { sendResponse } = require('../utils/responseHandler');

const submitHelpdesk = async (req, res) => {
    try {
        const { nama, nim, angkatan, email, jurusan } = req.body;

        if (!nama || !nim || !angkatan || !email || !jurusan) {
            return sendResponse(res, false, 'All fields are required', {}, 400);
        }

        const { db } = require('../services/dataService');
        
        // Cek apakah NIM atau Email sudah terdaftar di daftar anggota aktif (users.db)
        const userExists = await db.users.findOne({ $or: [{ nim: nim }, { email: email }] });
        if (userExists) {
            if (userExists.nim === nim) {
                return sendResponse(res, false, 'You are already on the list of this election (ID Number registered).', {}, 400);
            }
            if (userExists.email === email) {
                return sendResponse(res, false, 'You are already on the list of this election (Email registered).', {}, 400);
            }
        }

        const pending = await readPending();

        // Cek duplikat NIM atau Email di antrean pendaftaran (pending)
        const pendingExists = pending.find(p => p.nim === nim || p.email === email);
        if (pendingExists) {
            if (pendingExists.nim === nim) {
                return sendResponse(res, false, 'Your ID Number is currently in the verification queue.', {}, 400);
            }
            if (pendingExists.email === email) {
                return sendResponse(res, false, 'Your Email is currently in the verification queue.', {}, 400);
            }
        }

        const newEntry = {
            id: Date.now(),
            nama,
            nim,
            angkatan,
            jurusan,
            email,
            submitted_at: new Date().toISOString(),
            status: 'pending'
        };

        await db.pending.insert(newEntry);

        return sendResponse(res, true, 'Your registration has been submitted. We will contact you via email once verification is complete.', { id: newEntry.id });
    } catch (error) {
        console.error('Helpdesk error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

module.exports = { submitHelpdesk };
