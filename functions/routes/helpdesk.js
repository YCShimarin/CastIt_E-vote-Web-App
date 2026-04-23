const { readPending, writePending } = require('../services/dataService');
const { sendResponse } = require('../utils/responseHandler');

const submitHelpdesk = async (req, res) => {
    try {
        const { nama, nim, angkatan, email, jurusan } = req.body;

        if (!nama || !nim || !angkatan || !email || !jurusan) {
            return sendResponse(res, false, 'Semua field wajib diisi', {}, 400);
        }

        const pending = await readPending();

        // Cek duplikat NIM
        const exists = pending.some(p => p.nim === nim);
        if (exists) {
            return sendResponse(res, false, 'NIM ini sudah pernah mendaftar sebelumnya', {}, 400);
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

        pending.push(newEntry);
        await writePending(pending);

        return sendResponse(res, true, 'Permintaan Anda telah diterima. Kami akan menghubungi Anda melalui email setelah verifikasi selesai.', { id: newEntry.id });
    } catch (error) {
        console.error('Helpdesk error:', error);
        return sendResponse(res, false, 'Internal server error', {}, 500);
    }
};

module.exports = { submitHelpdesk };
