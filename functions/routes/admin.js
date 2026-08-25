const { readSettings, writeSettings, readPending, writePending, readUsers, writeUsers, getUserByUsername, writeLog, readLogs, getAdmin } = require('../services/dataService');
const { sendResponse } = require('../utils/responseHandler');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
        if (admin.role === 'admin_verificator' && admin.category) {
            pending = pending.filter(p => p.category === admin.category);
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
                fullName: admin.fullName,
                role: admin.role,
                category: admin.category
            },
            stats: {
                totalUsers,
                totalVoted,
                notVoted: totalUsers - totalVoted,
                progressPercentage: totalUsers === 0 ? 0 : Math.round((totalVoted / totalUsers) * 100)
            },
            logs: await readLogs()
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

        await writeLog(admin.username, `Changed voting status to: ${settings.voting_open ? 'OPEN' : 'CLOSED'}`);

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
            const { requestId, approve } = req.body;
            const { db } = require('../services/dataService');
            
            const reqUser = await db.pending.findOne({ id: requestId });
            if (!reqUser) return sendResponse(res, false, 'Registrasi tidak ditemukan', {}, 404);

            // Check department permission
            if (admin.role === 'admin_verificator' && admin.category !== reqUser.category) {
                return sendResponse(res, false, `Unauthorized: Anda hanya bisa memproses category ${admin.category}`, {}, 403);
            }

            // Remove from pending
            await db.pending.remove({ id: requestId });

            if (approve) {
                // Generate Password Aman: MD5(idNumber + Secret) ambil sepanjang idNumber
                const secretSalt = "ORGXYZ_VOTING_2026"; // Kunci rahasia untuk enkripsi
                const nimHash = crypto.createHash('md5').update(reqUser.idNumber + secretSalt).digest('hex');
                const passwordSuffix = nimHash.substring(0, reqUser.idNumber.length);

                // Ambil kata pertama dari fullName untuk password (huruf kecil)
                const firstName = reqUser.fullName.trim().split(' ')[0].toLowerCase();
                const generatedPassword = `${firstName}@${passwordSuffix}`;

                // Generate ID numerik (max + 1)
                const usersList = await db.users.find({}).sort({ id: -1 }).limit(1);
                const nextId = usersList.length > 0 && usersList[0].id ? usersList[0].id + 1 : 1;

                const newUser = {
                    id: nextId,
                    fullName: reqUser.fullName,
                    idNumber: reqUser.idNumber,
                    username: reqUser.idNumber,
                    password: generatedPassword,
                    email: reqUser.email,
                    batch: reqUser.batch || '-',
                    category: reqUser.category,
                    role: 'user',
                    has_voted: false,
                    vote: null,
                    voted_at: null
                };
                await db.users.insert(newUser);
                await writeLog(admin.username, `Approved registration for user ${reqUser.fullName} (${reqUser.idNumber})`);
                return sendResponse(res, true, `User ${reqUser.fullName} telah disetujui.`, {
                    email: reqUser.email,
                    fullName: reqUser.fullName,
                    username: reqUser.idNumber,
                    password: generatedPassword
                });
            }
            await writeLog(admin.username, `Rejected registration for user ${reqUser.fullName} (${reqUser.idNumber})`);
            return sendResponse(res, true, `Pendaftaran ${reqUser.fullName} ditolak.`);
        }

        if (action === 'reset_votes') {
            if (admin.role !== 'admin') return sendResponse(res, false, 'Unauthorized', {}, 403);
            const users = await readUsers();
            const resetUsers = users.map(u => ({ ...u, has_voted: false, vote: null, voted_at: null }));
            await writeUsers(resetUsers);
            await writeLog(admin.username, `RESET all voting data`);
            return sendResponse(res, true, 'Database voting telah dikosongkan.');
        }

        if (action === 'factory_reset') {
            if (admin.role !== 'admin') return sendResponse(res, false, 'Unauthorized', {}, 403);
            const { db } = require('../services/dataService');
            
            // Remove all documents from collections
            await db.users.remove({}, { multi: true });
            await db.feedbacks.remove({}, { multi: true });
            await db.pending.remove({}, { multi: true });
            await db.logs.remove({}, { multi: true });
            await db.sessions.remove({}, { multi: true });
            
            // Log this specific action so the log is not completely empty
            await db.logs.insert({ user: admin.username, action: 'SYSTEM FACTORY RESET', time: new Date().toISOString() });

            return sendResponse(res, true, 'Factory reset berhasil. Semua data telah dikosongkan.');
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
            await writeLog(admin.username, `Deleted user with ID ${targetId}`);
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
                    $or: [
                        { username: new RegExp(`^${userData.username}$`, 'i') },
                        { idNumber: userData.idNumber },
                        { email: userData.email && userData.email.trim() !== '' ? userData.email : null }
                    ],
                    _id: { $ne: targetId }
                });
                
                if (existing) {
                    if (existing.username.toLowerCase() === userData.username.toLowerCase()) {
                        return sendResponse(res, false, 'Username sudah digunakan oleh user lain', {}, 400);
                    }
                    if (existing.idNumber === userData.idNumber) {
                        return sendResponse(res, false, 'ID Number sudah digunakan oleh user lain', {}, 400);
                    }
                    if (existing.email === userData.email) {
                        return sendResponse(res, false, 'Email sudah digunakan oleh user lain', {}, 400);
                    }
                }
            }

            const updated = await db.users.update({ _id: targetId }, { $set: userData });
            console.log(`[Admin] Update successful. Docs affected: ${updated}`);
            await writeLog(admin.username, `Updated data for user ${userData.username}`);
            return sendResponse(res, true, 'Data user berhasil diperbarui');
        }

        if (action === 'create_user') {
            if (admin.role !== 'admin') return sendResponse(res, false, 'Unauthorized', {}, 403);
            const { userData } = req.body;
            const { db } = require('../services/dataService');

            console.log(`[Admin] Creating new user:`, userData);

            const existing = await db.users.findOne({ 
                $or: [
                    { username: new RegExp(`^${userData.username}$`, 'i') },
                    { idNumber: userData.idNumber },
                    { email: userData.email && userData.email.trim() !== '' ? userData.email : null }
                ]
            });
            
            if (existing) {
                if (existing.username.toLowerCase() === userData.username.toLowerCase()) {
                    return sendResponse(res, false, 'Username sudah terdaftar', {}, 400);
                }
                if (existing.idNumber === userData.idNumber) {
                    return sendResponse(res, false, 'ID Number sudah terdaftar', {}, 400);
                }
                if (existing.email === userData.email) {
                    return sendResponse(res, false, 'Email sudah terdaftar', {}, 400);
                }
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
            await writeLog(admin.username, `Added new user ${userData.username}`);
            return sendResponse(res, true, 'User berhasil ditambahkan');
        }

        if (action === 'save_config') {
            if (admin.role !== 'admin') return sendResponse(res, false, 'Unauthorized', {}, 403);
            const { configData } = req.body;
            if (!configData) return sendResponse(res, false, 'Data konfigurasi kosong', {}, 400);

            try {
                // Ensure the root path exists
                const rootConfigPath = path.join(__dirname, '../web_config.json');
                fs.writeFileSync(rootConfigPath, JSON.stringify(configData, null, 2));

                await writeLog(admin.username, `Saved Web Config settings`);

                return sendResponse(res, true, 'Konfigurasi web berhasil diperbarui');
            } catch (err) {
                console.error('Failed to write web config:', err);
                return sendResponse(res, false, 'Gagal menyimpan konfigurasi', {}, 500);
            }
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
