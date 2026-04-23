import { apiFetch, showToast } from '../utils/api.js';

const initAdminPage = async () => {
    console.log('Admin Page Initializing...');
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Auth Check
    if (!user || (user.role !== 'admin' && user.role !== 'admin_verificator')) {
        window.location.href = 'index.html';
        return;
    }

    // Role-based UI Adjustments
    if (user.role === 'admin_verificator') {
        // Hide restricted sections
        const hideMe = ['section-quick-actions', 'section-voting-status', 'section-stats-grid', 'section-audit-log'];
        hideMe.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Make the main table full width
        const mainTable = document.getElementById('section-main-table');
        if (mainTable) mainTable.style.gridTemplateColumns = '1fr';

        // Update titles
        const h1 = document.querySelector('h1');
        if (h1) h1.textContent = `Verifikator ${user.jurusan}`;
        const p = document.querySelector('p[style*="color: var(--text-muted)"]');
        if (p) p.textContent = `Anda bertugas memproses pendaftaran khusus jurusan ${user.jurusan}.`;
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        };
    }

    const toggleBtn = document.getElementById('voting-toggle');
    const statusLabel = document.getElementById('voting-status-label');
    const feedback = document.getElementById('toggle-feedback');
    let votingOpen = false;

    const updateToggleUI = (isOpen) => {
        votingOpen = isOpen;
        if (toggleBtn) {
            toggleBtn.className = `toggle-btn ${isOpen ? 'on' : 'off'}`;
        }
        if (statusLabel) {
            statusLabel.textContent = isOpen ? '✅ Voting DIBUKA' : '🔒 Voting DITUTUP';
            statusLabel.style.color = isOpen ? '#16a34a' : '#64748b';
        }
    };

    // --- QUICK ACTIONS ---

    // Export Excel
    const exportBtn = document.getElementById('btn-export-excel');
    if (exportBtn) {
        exportBtn.onclick = async () => {
            try {
                if (typeof XLSX === 'undefined') {
                    showToast('Library Excel sedang dimuat, coba lagi...', 'error');
                    return;
                }
                const res = await apiFetch('/result');
                if (res && res.success) {
                    const data = res.data.candidates.map(c => ({
                        'ID': c.id,
                        'Nama': c.nama,
                        'Hasil Suara': res.data.voteCounts[c.id]?.count || 0
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Hasil");
                    XLSX.writeFile(wb, `KATUA_VOTING_REPORT.xlsx`);
                } else {
                    showToast('Gagal ambil data hasil: ' + (res.message || 'Error'), 'error');
                }
            } catch (e) { 
                console.error('Export Error:', e);
                showToast('Gagal ekspor Hasil: ' + e.message, 'error'); 
            }
        };
    }

    // Export Users
    const exportUsersBtn = document.getElementById('btn-export-users');
    if (exportUsersBtn) {
        exportUsersBtn.onclick = async () => {
            try {
                if (typeof XLSX === 'undefined') {
                    showToast('Library Excel sedang dimuat, coba lagi...', 'error');
                    return;
                }
                const res = await apiFetch('/admin/users?username=' + user.username);
                if (res && res.success) {
                    const data = res.data.map(u => ({
                        'ID': u.id,
                        'Nama': u.nama,
                        'NIM': u.nim,
                        'Angkatan': u.angkatan,
                        'Jurusan': u.jurusan,
                        'Email': u.email,
                        'Status Voting': u.has_voted ? 'SUDAH' : 'BELUM',
                        'Pilihan (ID)': u.vote || '-',
                        'Waktu Voting': u.voted_at ? new Date(u.voted_at).toLocaleString() : '-'
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Data Pemilih");
                    XLSX.writeFile(wb, `KATUA_VOTERS_LIST.xlsx`);
                    showToast('Data pemilih berhasil diunduh');
                } else {
                    showToast('Gagal ambil data user: ' + (res.message || 'Error'), 'error');
                }
            } catch (e) { 
                console.error('Export Users Error:', e);
                showToast('Gagal ekspor Data Pemilih: ' + e.message, 'error'); 
            }
        };
    }

    // Force Sync
    const syncBtn = document.getElementById('btn-force-sync');
    if (syncBtn) {
        syncBtn.onclick = async () => {
            if (confirm('Sinkronisasi ulang akan mereset data di browser Anda ke data asli dari file JSON. Lanjutkan?')) {
                await apiFetch('/admin/action', { method: 'POST', body: JSON.stringify({ action: 'force_sync', username: user.username }) });
                window.location.reload();
            }
        };
    }

    // Reset Data
    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
        resetBtn.onclick = async () => {
            if (confirm('⚠️ PERINGATAN: Menghapus semua hasil suara?')) {
                const res = await apiFetch('/admin/action', { method: 'POST', body: JSON.stringify({ action: 'reset_votes', username: user.username }) });
                if (res && res.success) {
                    loadAdminData();
                    showToast('Database Suara Direset');
                } else {
                    showToast(res.message || 'Gagal mereset', 'error');
                }
            }
        };
    }

    // Voting Toggle
    if (toggleBtn) {
        toggleBtn.onclick = async () => {
            const res = await apiFetch('/admin/toggle-voting', {
                method: 'POST',
                body: JSON.stringify({ username: user.username, open: !votingOpen })
            });
            if (res && res.success) {
                updateToggleUI(res.data.voting_open);
                if (feedback) feedback.textContent = `Pembaruan terakhir: ${new Date().toLocaleTimeString()}`;
                loadAdminData();
            } else {
                showToast(res.message || 'Gagal mengubah status', 'error');
            }
        };
    }

    // --- RENDER FUNCTIONS ---

    window.processReg = async (id, approve) => {
        const res = await apiFetch('/admin/action', {
            method: 'POST',
            body: JSON.stringify({ action: 'process_registration', requestId: id, approve, username: user.username })
        });
        
        if (res && res.success) {
            showToast(res.message);
            
            // If approved, trigger mailto
            if (approve && res.data && res.data.email) {
                const mailBody = `Halo ${res.data.nama},\n\nPendaftaran akun voting KATUA Anda telah disetujui.\n\nUsername: ${res.data.username}\nPassword: ${res.data.password}\n\nSilakan login dan berikan suara Anda pada tanggal pemilihan nanti.\n\nTerima kasih.`;
                const mailtoUrl = `mailto:${res.data.email}?subject=Konfirmasi Akun Voting KATUA&body=${encodeURIComponent(mailBody)}`;
                window.open(mailtoUrl, '_blank');
            }
            
            loadAdminData();
        } else {
            showToast(res.message || 'Gagal memproses', 'error');
        }
    };

    const renderPendingTable = (pending) => {
        const container = document.getElementById('pending-table-container');
        if (!container) return;

        if (!pending || pending.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Tidak ada pendaftaran tertunda.</p>';
            return;
        }

        let html = '<table class="pending-table"><thead><tr><th>Nama</th><th>NIM</th><th>Jurusan</th><th>Aksi</th></tr></thead><tbody>';
        pending.forEach(p => {
            html += `<tr>
                <td><strong>${p.nama}</strong><br><span style="font-size:0.7rem;color:var(--text-muted);">${p.email}</span></td>
                <td>${p.nim}</td>
                <td>${p.jurusan}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-sm-approve" onclick="processReg(${p.id}, true)">Setuju</button>
                    <button class="btn-sm-reject" onclick="processReg(${p.id}, false)">Tolak</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    };

    const renderAuditLogs = (logs) => {
        const container = document.getElementById('audit-log-container');
        if (!container) return;
        if (!logs || logs.length === 0) return;

        container.innerHTML = logs.map(l => `
            <div class="audit-item">
                <span class="audit-time">${new Date(l.time).toLocaleTimeString()}</span>
                <strong>${l.user}</strong>: ${l.action}
            </div>
        `).join('');
    };

    const renderStandings = (data) => {
        const container = document.getElementById('standings-container');
        if (!container || !data.candidates) return;

        let html = '<table class="pending-table" style="margin:0;"><thead><tr><th>Kandidat</th><th>Suara</th><th>%</th></tr></thead><tbody>';
        data.candidates.forEach(c => {
            const count = data.voteCounts[c.id]?.count || 0;
            const pct = data.voteCounts[c.id]?.percentage || 0;
            html += `<tr>
                <td><strong>${c.nama}</strong></td>
                <td>${count}</td>
                <td><span style="background:var(--primary-light); color:var(--primary-dark); padding:2px 8px; border-radius:12px; font-size:0.75rem;">${pct}%</span></td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    };

    const loadAdminData = async () => {
        // Pass username for authorization and filtering
        const res = await apiFetch(`/admin/status?username=${user.username}`);
        if (res && res.success) {
            updateToggleUI(res.data.voting_open);
            
            // Stats (Only update if sections are visible)
            const totalEl = document.getElementById('stat-total');
            if (totalEl) totalEl.textContent = res.data.stats.totalUsers || 0;
            const votedEl = document.getElementById('stat-voted');
            if (votedEl) votedEl.textContent = res.data.stats.totalVoted || 0;
            const pendingEl = document.getElementById('stat-pending');
            if (pendingEl) pendingEl.textContent = res.data.pending_count || 0;

            renderPendingTable(res.data.pending_users);
        }

        // Load Standings (Skip if verificator)
        if (user.role !== 'admin_verificator') {
            const resResults = await apiFetch('/result');
            if (resResults && resResults.success) {
                renderStandings(resResults.data);
            }
        }
    };

    loadAdminData();
};

document.addEventListener('DOMContentLoaded', initAdminPage);
