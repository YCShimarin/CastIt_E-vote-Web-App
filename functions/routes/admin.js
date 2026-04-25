const { readSettings, writeSettings, readPending, writePending, readUsers, writeUsers, getUserByUsername } = require('../services/dataService');
const { sendResponse } = require('../utils/responseHandler');
const crypto = require('crypto');

/**
 * Helper to check admin role and jurusan
 */
const getAdmin = async (username) => {
    if (!username) return null;
    const user = await getUserByUsername(username);
    if (!user) return null;
    if (user.role === 'admin' || user.role === 'admin_verificator') {
        return user;
    }
    // Backward compatibility for old admin
    if (username.toLowerCase() === 'admin') {
        return { username: 'admin', role: 'admin', nama: 'Super Admin' };
    }
    return null;
};

/**
 * GET /admin/status
 * Mengambil status voting saat ini dan daftar pendaftaran yang tertunda.
 */
const getStatus = async (req, res) => {
    try {
        const { username } = req.query;
        const admin = await getAdmin(username);

        if (!admin) {
            return sendResponse(res, false, 'Unauthorized', {}, 403);
        }

        const settings = await readSettings();
        let pending = await readPending();
        
        // Filter pending users if admin is a verificator
        if (admin.role === 'admin_verificator' && admin.jurusan) {
            pending = pending.filter(p => p.jurusan === admin.jurusan);
        }

        // Ambil data statistik dari users.json
        const users = await readUsers();
        // Exclude admins from stats
        let statsUsers = users.filter(u => u.role !== 'admin' && u.role !== 'admin_verificator');

        const totalUsers = statsUsers.length;
        const totalVoted = statsUsers.filter(u => u.has_voted).length;

        return sendResponse(res, true, 'OK', {
            voting_open: settings.voting_open,
            pending_count: pending.length,
            pending_users: pending,
            admin: {
                nama: admin.nama,
                role: admin.role,
                jurusan: admin.jurusan
            },
            stats: {
                totalUsers,
                totalVoted,
                notVoted: totalUsers - totalVoted,
                progressPercentage: totalUsers === 0 ? 0 : Math.round((totalVoted / totalUsers) * 100)
            }
        });
    } catch (error) {
        console.error('[Get Admin Status Error]', error);
        return sendResponse(res, false, 'Error: ' + error.message, {}, 500);
    }
};

/**
 * POST /admin/toggle-voting
 * Membuka atau menutup sesi voting.
 */
const toggleVoting = async (req, res) => {
    try {
        const { username, open } = req.body;
        const admin = await getAdmin(username);

        if (!admin || admin.role !== 'admin') {
            return sendResponse(res, false, 'Unauthorized: Hanya Super Admin yang dapat mengubah status.', {}, 403);
        }

        const settings = await readSettings();
        settings.voting_open = typeof open === 'boolean' ? open : !settings.voting_open;
        await writeSettings(settings);

        return sendResponse(res, true, `Voting sekarang: ${settings.voting_open ? 'DIBUKA' : 'DITUTUP'}`, {
            voting_open: settings.voting_open
        });
    } catch (error) {
        console.error('[Toggle Voting Error]', error);
        return sendResponse(res, false, 'Error: ' + error.message, {}, 500);
    }
};

/**
 * POST /admin/action
 * Menangani aksi administratif seperti memproses pendaftaran dan reset database.
 */
const doAdminAction = async (req, res) => {
    try {
        const { action, username, requestId, approve } = req.body;
        const admin = await getAdmin(username);

        if (!admin) {
            return sendResponse(res, false, 'Unauthorized', {}, 403);
        }

        if (action === 'process_registration') {
            const pending = await readPending();
            const idx = pending.findIndex(p => p.id === requestId);
            if (idx === -1) return sendResponse(res, false, 'Registrasi tidak ditemukan', {}, 404);

            const reqUser = pending[idx];

            // Check department permission
            if (admin.role === 'admin_verificator' && admin.jurusan !== reqUser.jurusan) {
                return sendResponse(res, false, `Unauthorized: Anda hanya bisa memproses jurusan ${admin.jurusan}`, {}, 403);
            }

            // Remove from pending
            pending.splice(idx, 1);
            await writePending(pending);

            if (approve) {
                const users = await readUsers();

                // Generate Password Aman: MD5(NIM + Secret) ambil sepanjang NIM
                const secretSalt = "KATUA_VOTING_UNAND_2026"; // Kunci rahasia untuk enkripsi
                const nimHash = crypto.createHash('md5').update(reqUser.nim + secretSalt).digest('hex');
                const passwordSuffix = nimHash.substring(0, reqUser.nim.length);

                // Ambil kata pertama dari nama untuk password (huruf kecil)
                const firstName = reqUser.nama.trim().split(' ')[0].toLowerCase();
                const generatedPassword = `${firstName}@${passwordSuffix}`;

                // Generate ID numerik (max + 1)
                const nextId = users.length > 0 ? Math.max(...users.map(u => u.id || 0)) + 1 : 1;

                users.push({
                    id: nextId,
                    nama: reqUser.nama,
                    nim: reqUser.nim,
                    username: reqUser.nim,
                    password: generatedPassword,
                    email: reqUser.email,
                    angkatan: reqUser.angkatan || '-',
                    jurusan: reqUser.jurusan,
                    role: 'user',
                    has_voted: false,
                    vote: null,
                    voted_at: null
                });
                await writeUsers(users);
                return sendResponse(res, true, `User ${reqUser.nama} telah disetujui.`, {
                    email: reqUser.email,
                    nama: reqUser.nama,
                    username: reqUser.nim,
                    password: generatedPassword
                });
            }
            return sendResponse(res, true, `Pendaftaran ${reqUser.nama} ditolak.`);
        }

        if (action === 'reset_votes') {
            if (admin.role !== 'admin') return sendResponse(res, false, 'Unauthorized', {}, 403);
            const users = await readUsers();
            const resetUsers = users.map(u => ({ ...u, has_voted: false, vote: null, voted_at: null }));
            await writeUsers(resetUsers);
            return sendResponse(res, true, 'Database voting telah dikosongkan.');
        }

        if (action === 'force_sync') {
             // Admin Verificator can force sync their own local session if needed, 
             // but usually this is a global action. Let's allow it for now.
             return sendResponse(res, true, 'Sync complete');
        }

        // --- NEW CRUD ACTIONS ---
        
        if (action === 'delete_user') {
            if (admin.role !== 'admin') return sendResponse(res, false, 'Unauthorized', {}, 403);
            const { targetId } = req.body;
            const { db } = require('../services/dataService');
            await db.users.remove({ _id: targetId });
            return sendResponse(res, true, 'User berhasil dihapus');
        }

        if (action === 'update_user') {
            if (admin.role !== 'admin') return sendResponse(res, false, 'Unauthorized', {}, 403);
            const { targetId, userData } = req.body;
            const { db } = require('../services/dataService');
            
            console.log(`[Admin] Updating user ${targetId}:`, userData);

            // Prevent changing username to a duplicate
            if (userData.username) {
                const existing = await db.users.findOne({ 
                    username: new RegExp(`^${userData.username}$`, 'i'),
                    _id: { $ne: targetId }
                });
                if (existing) {
                    console.warn(`[Admin] Update failed: Username ${userData.username} already exists`);
                    return sendResponse(res, false, 'Username sudah digunakan oleh user lain', {}, 400);
                }
            }

            const updated = await db.users.update({ _id: targetId }, { $set: userData });
            console.log(`[Admin] Update successful. Docs affected: ${updated}`);
            return sendResponse(res, true, 'Data user berhasil diperbarui');
        }

        if (action === 'create_user') {
            if (admin.role !== 'admin') return sendResponse(res, false, 'Unauthorized', {}, 403);
            const { userData } = req.body;
            const { db } = require('../services/dataService');

            console.log(`[Admin] Creating new user:`, userData);

            const existing = await db.users.findOne({ username: new RegExp(`^${userData.username}$`, 'i') });
            if (existing) {
                console.warn(`[Admin] Create failed: Username ${userData.username} already exists`);
                return sendResponse(res, false, 'Username sudah terdaftar', {}, 400);
            }

            const newUser = {
                ...userData,
                role: userData.role || 'user',
                has_voted: false,
                vote: null,
                voted_at: null,
                created_at: new Date().toISOString()
            };
            await db.users.insert(newUser);
            console.log(`[Admin] User created successfully: ${userData.username}`);
            return sendResponse(res, true, 'User berhasil ditambahkan');
        }

        return sendResponse(res, false, 'Aksi tidak dikenal', {}, 400);
    } catch (error) {
        console.error('[Admin Action Error]', error);
        return sendResponse(res, false, 'Error: ' + error.message, {}, 500);
    }
};

const getUsersList = async (req, res) => {
    try {
        const { username } = req.query;
        const admin = await getAdmin(username);
        if (!admin) return sendResponse(res, false, 'Unauthorized', {}, 403);

        const users = await readUsers();
        return sendResponse(res, true, 'OK', users);
    } catch (error) {
        console.error('[Get Users List Error]', error);
        return sendResponse(res, false, 'Error: ' + error.message, [], 500);
    }
};

module.exports = { getStatus, toggleVoting, doAdminAction, getUsersList };
