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
        const hideMe = ['section-quick-actions', 'section-voting-status', 'section-stats-grid', 'section-audit-log', 'section-user-management'];
        hideMe.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Make the main table full width
        const mainTable = document.getElementById('section-main-table');
        if (mainTable) mainTable.style.gridTemplateColumns = '1fr';

        // Update titles
        const h1 = document.querySelector('h1');
        if (h1) h1.textContent = `Verificator ${user.category}`;
        const p = document.querySelector('p[style*="color: var(--text-muted)"]');
        if (p) p.textContent = `You are tasked with processing registrations specifically for ${user.category}.`;
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (user.sessionToken) {
                await apiFetch('/auth/logout', {
                    method: 'POST',
                    body: JSON.stringify({ sessionToken: user.sessionToken })
                });
            }
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
            statusLabel.textContent = isOpen ? '✅ Voting OPENED' : '🔒 Voting CLOSED';
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
                    XLSX.utils.book_append_sheet(wb, ws, "Results");
                    XLSX.writeFile(wb, `KATUA_VOTING_REPORT.xlsx`);
                } else {
                    showToast('Failed to fetch results data: ' + (res.message || 'Error'), 'error');
                }
            } catch (e) { 
                console.error('Export Error:', e);
                showToast('Failed to export results: ' + e.message, 'error'); 
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
                        'Name': u.fullName,
                        'User ID': u.idNumber,
                        'Batch': u.batch,
                        'Category': u.category,
                        'Email': u.email,
                        'Voting Status': u.has_voted ? 'VOTED' : 'NOT YET',
                        'Choice (ID)': u.vote || '-',
                        'Vote Time': u.voted_at ? new Date(u.voted_at).toLocaleString() : '-'
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Voter Data");
                    XLSX.writeFile(wb, `KATUA_VOTERS_LIST.xlsx`);
                    showToast('Voter data successfully downloaded');
                } else {
                    showToast('Failed to fetch user data: ' + (res.message || 'Error'), 'error');
                }
            } catch (e) { 
                console.error('Export Users Error:', e);
                showToast('Failed to export Voter Data: ' + e.message, 'error'); 
            }
        };
    }

    // Force Sync
    const syncBtn = document.getElementById('btn-force-sync');
    if (syncBtn) {
        syncBtn.onclick = async () => {
            if (confirm('Resyncing will reset browser data to original JSON file. Continue?')) {
                await apiFetch('/admin/action', { method: 'POST', body: JSON.stringify({ action: 'force_sync', username: user.username }) });
                window.location.reload();
            }
        };
    }

    // Reset Data
    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
        resetBtn.onclick = async () => {
            if (confirm('⚠️ WARNING: Delete all votes?')) {
                const res = await apiFetch('/admin/action', { method: 'POST', body: JSON.stringify({ action: 'reset_votes', username: user.username }) });
                if (res && res.success) {
                    loadAdminData();
                    showToast('Voting Database Reset');
                } else {
                    showToast(res.message || 'Reset failed', 'error');
                }
            }
        };
    }

    const factoryResetBtn = document.getElementById('btn-factory-reset');
    if (factoryResetBtn) {
        factoryResetBtn.onclick = async () => {
            if (confirm('🔥 DANGER: This will delete ALL users, feedbacks, and logs! Are you absolutely sure you want to Factory Reset?')) {
                const promptConfirm = prompt('Type "RESET" to confirm factory reset:');
                if (promptConfirm === 'RESET') {
                    const res = await apiFetch('/admin/action', { method: 'POST', body: JSON.stringify({ action: 'factory_reset', username: user.username }) });
                    if (res && res.success) {
                        alert('Factory Reset Complete. The system is now completely empty.');
                        loadAdminData();
                        showToast('Factory Reset Complete');
                    } else {
                        showToast(res.message || 'Factory Reset failed', 'error');
                    }
                } else {
                    showToast('Factory Reset cancelled', 'error');
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
                if (feedback) feedback.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
                loadAdminData();
            } else {
                showToast(res.message || 'Failed to change status', 'error');
            }
        };
    }

    // --- WEB CONFIG MANAGEMENT ---
    let currentWebConfig = {};
    const loadWebConfig = async () => {
        if (user.role !== 'admin') return;
        try {
            const res = await fetch('/admin/config');
            if (res.ok) {
                currentWebConfig = await res.json();
                const configSection = document.getElementById('section-web-config');
                if (configSection) configSection.style.display = 'block';
                
                if (currentWebConfig.website) {
                    document.getElementById('config-web-name').value = currentWebConfig.website.name || '';
                    document.getElementById('config-web-title').value = currentWebConfig.website.title || '';
                    document.getElementById('config-web-desc').value = currentWebConfig.website.description || '';
                }
                if (currentWebConfig.additional_settings) {
                    document.getElementById('config-web-footer').value = currentWebConfig.additional_settings.footer_text || '';
                }
                if (currentWebConfig.categories) {
                    document.getElementById('config-categories').value = currentWebConfig.categories.join(', ');
                    
                    // Populate User Category dropdown in Add User Modal
                    const userJurusan = document.getElementById('user-category');
                    if (userJurusan) {
                        userJurusan.innerHTML = '';
                        currentWebConfig.categories.forEach(cat => {
                            const opt = document.createElement('option');
                            opt.value = cat;
                            opt.textContent = cat;
                            userJurusan.appendChild(opt);
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load web config', e);
        }
    };

    const saveConfigBtn = document.getElementById('btn-save-config');
    if (saveConfigBtn) {
        saveConfigBtn.onclick = async () => {
            saveConfigBtn.disabled = true;
            saveConfigBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            if (!currentWebConfig.website) currentWebConfig.website = {};
            currentWebConfig.website.name = document.getElementById('config-web-name').value;
            currentWebConfig.website.title = document.getElementById('config-web-title').value;
            currentWebConfig.website.description = document.getElementById('config-web-desc').value;
            
            if (!currentWebConfig.additional_settings) currentWebConfig.additional_settings = {};
            currentWebConfig.additional_settings.footer_text = document.getElementById('config-web-footer').value;

            const catsStr = document.getElementById('config-categories').value;
            currentWebConfig.categories = catsStr.split(',').map(c => c.trim()).filter(c => c);

            const res = await apiFetch('/admin/action', {
                method: 'POST',
                body: JSON.stringify({ action: 'save_config', username: user.username, configData: currentWebConfig })
            });

            if (res && res.success) {
                showToast('Web Configuration Saved Successfully!');
            } else {
                showToast(res.message || 'Failed to save configuration', 'error');
            }
            saveConfigBtn.disabled = false;
            saveConfigBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        };
    }

    // --- USER MANAGEMENT ---
    let allUsers = [];
    let filteredUsers = [];

    const loadUserManagement = async () => {
        if (user.role !== 'admin') return;
        const res = await apiFetch('/admin/users?username=' + user.username);
        if (res && res.success) {
            allUsers = res.data.filter(u => u.role === 'user' || !u.role);
            filteredUsers = [...allUsers];
            currentPage = 1;
            renderUserTable(filteredUsers);
        }
    };

    let currentPage = 1;
    const itemsPerPage = 10;

    const renderUserTable = (usersList) => {
        const container = document.getElementById('user-list-container');
        const paginationContainer = document.getElementById('user-pagination');
        if (!container) return;

        if (usersList.length === 0) {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No users found.</td></tr>';
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(usersList.length / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages;
        
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const currentData = usersList.slice(start, end);

        container.innerHTML = currentData.map(u => `
            <tr>
                <td><strong>${u.fullName}</strong><br><span style="font-size:0.7rem;color:var(--text-muted);">${u.email || '-'}</span></td>
                <td><code>${u.username}</code><br><span style="font-size:0.7rem;color:var(--text-muted);">ID: ${u.idNumber}</span></td>
                <td>${u.category}<br><span style="font-size:0.7rem;color:var(--text-muted);">Batch ${u.batch || '-'}</span></td>
                <td>
                    ${u.has_voted ? 
                        '<span style="color:#16a34a; font-size:0.8rem; font-weight:600;"><i class="fas fa-check-circle"></i> VOTED</span>' : 
                        '<span style="color:#94a3b8; font-size:0.8rem;"><i class="fas fa-clock"></i> PENDING</span>'}
                </td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn" style="padding:5px 10px; background:#f1f5f9; color:var(--primary);" onclick="editUser('${u._id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn" style="padding:5px 10px; background:#fef2f2; color:#ef4444;" onclick="deleteUser('${u._id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

        if (paginationContainer) {
            let pagHtml = '';
            pagHtml += `<button class="btn btn-outline" style="padding:4px 10px; font-size:0.8rem;" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>`;
            pagHtml += `<span style="font-size:0.9rem; align-self:center;">Page ${currentPage} of ${totalPages}</span>`;
            pagHtml += `<button class="btn btn-outline" style="padding:4px 10px; font-size:0.8rem;" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
            paginationContainer.innerHTML = pagHtml;
        }
    };

    window.changePage = (dir) => {
        currentPage += dir;
        renderUserTable(filteredUsers);
    };

    // Search Logic
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const val = e.target.value.toLowerCase();
            filteredUsers = allUsers.filter(u => 
                u.fullName.toLowerCase().includes(val) || 
                u.idNumber.toLowerCase().includes(val) || 
                u.username.toLowerCase().includes(val)
            );
            currentPage = 1;
            renderUserTable(filteredUsers);
        };
    }

    // Add User Modal
    const userModal = document.getElementById('user-modal');
    const userForm = document.getElementById('user-form');
    const closeUserModal = document.getElementById('close-user-modal');
    const addUserBtn = document.getElementById('btn-add-user');

    if (addUserBtn) {
        addUserBtn.onclick = () => {
            document.getElementById('modal-user-title').textContent = 'Add New User';
            userForm.reset();
            document.getElementById('edit-user-id').value = '';
            userModal.classList.add('open');
        };
    }

    if (closeUserModal) {
        closeUserModal.onclick = () => userModal.classList.remove('open');
    }

    window.editUser = (id) => {
        const u = allUsers.find(x => x._id === id);
        if (!u) return;

        document.getElementById('modal-user-title').textContent = 'Edit User Data';
        document.getElementById('edit-user-id').value = u._id;
        document.getElementById('user-fullName').value = u.fullName;
        document.getElementById('user-idNumber').value = u.idNumber;
        document.getElementById('user-username').value = u.username;
        document.getElementById('user-password').value = u.password;
        document.getElementById('user-category').value = u.category;
        document.getElementById('user-batch').value = u.batch || '';
        document.getElementById('user-email').value = u.email || '';

        userModal.classList.add('open');
    };

    window.deleteUser = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        const res = await apiFetch('/admin/action', {
            method: 'POST',
            body: JSON.stringify({ action: 'delete_user', username: user.username, targetId: id })
        });
        if (res && res.success) {
            showToast('User deleted successfully');
            loadUserManagement();
        } else {
            showToast(res.message || 'Failed to delete', 'error');
        }
    };

    if (userForm) {
        userForm.onsubmit = async (e) => {
            e.preventDefault();
            const editId = document.getElementById('edit-user-id').value;
            const action = editId ? 'update_user' : 'create_user';
            
            const userData = {
                fullName: document.getElementById('user-fullName').value,
                idNumber: document.getElementById('user-idNumber').value,
                username: document.getElementById('user-username').value,
                password: document.getElementById('user-password').value,
                category: document.getElementById('user-category').value,
                batch: document.getElementById('user-batch').value,
                email: document.getElementById('user-email').value
            };

            const res = await apiFetch('/admin/action', {
                method: 'POST',
                body: JSON.stringify({ action, username: user.username, targetId: editId, userData })
            });

            if (res && res.success) {
                showToast(res.message);
                userModal.classList.remove('open');
                loadUserManagement();
            } else {
                showToast(res.message || 'Failed to save data', 'error');
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
                const mailBody = `Hello ${res.data.fullName},\n\nYour voting account registration has been approved.\n\nUsername: ${res.data.username}\nPassword: ${res.data.password}\n\nPlease login and cast your vote on the election day.\n\nThank you.`;
                const mailtoUrl = `mailto:${res.data.email}?subject=Voting Account Confirmation&body=${encodeURIComponent(mailBody)}`;
                window.open(mailtoUrl, '_blank');
            }
            
            loadAdminData();
        } else {
            showToast(res.message || 'Failed to process', 'error');
        }
    };

    const renderPendingTable = (pending) => {
        const container = document.getElementById('pending-table-container');
        if (!container) return;

        if (!pending || pending.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No pending registrations.</p>';
            return;
        }

        let html = '<table class="pending-table"><thead><tr><th>Name</th><th>User ID</th><th>Category</th><th>Action</th></tr></thead><tbody>';
        pending.forEach(p => {
            html += `<tr>
                <td><strong>${p.fullName}</strong><br><span style="font-size:0.7rem;color:var(--text-muted);">${p.email}</span></td>
                <td>${p.idNumber}</td>
                <td>${p.category}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-sm-approve" onclick="processReg(${p.id}, true)">Approve</button>
                    <button class="btn-sm-reject" onclick="processReg(${p.id}, false)">Reject</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    };

    let globalLogs = [];

    const renderAuditLogs = (logs) => {
        globalLogs = logs;
        const container = document.getElementById('audit-log-container');
        if (!container) return;
        if (!logs || logs.length === 0) return;

        const visibleLogs = logs.slice(0, 5);
        container.innerHTML = visibleLogs.map(l => `
            <div class="audit-item">
                <span class="audit-time">${new Date(l.time).toLocaleTimeString()}</span>
                <strong>${l.user}</strong>: ${l.action}
            </div>
        `).join('');
    };

    const initLogsModal = () => {
        const btnViewAll = document.getElementById('btn-view-all-logs');
        const logsModal = document.getElementById('logs-modal');
        const closeLogsBtn = document.getElementById('close-logs-modal');
        const fullContainer = document.getElementById('full-audit-log-container');

        if (btnViewAll && logsModal && closeLogsBtn && fullContainer) {
            btnViewAll.onclick = () => {
                logsModal.style.display = 'flex';
                if (globalLogs.length === 0) {
                    fullContainer.innerHTML = '<p style="padding: 20px; color: var(--text-muted); text-align: center;">No activity yet.</p>';
                } else {
                    fullContainer.innerHTML = globalLogs.map(l => `
                        <div class="audit-item">
                            <span class="audit-time" style="width: 150px; display: inline-block;">${new Date(l.time).toLocaleString()}</span>
                            <strong>${l.user}</strong>: ${l.action}
                        </div>
                    `).join('');
                }
            };
            closeLogsBtn.onclick = () => { logsModal.style.display = 'none'; };
        }
    };
    initLogsModal();

    const renderStandings = (data) => {
        const container = document.getElementById('standings-container');
        if (!container || !data.candidates || data.candidates.length === 0) {
            if (container) container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No candidates data yet.</p>';
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 20px;">';
        
        // Sort candidates by percentage
        const sortedCandidates = [...data.candidates].sort((a, b) => {
            const pctA = data.voteCounts[a.id]?.percentage || 0;
            const pctB = data.voteCounts[b.id]?.percentage || 0;
            return pctB - pctA;
        });

        sortedCandidates.forEach((c, index) => {
            const count = data.voteCounts[c.id]?.count || 0;
            const pct = data.voteCounts[c.id]?.percentage || 0;
            
            // Assign different colors based on rank
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
            const barColor = colors[index % colors.length];

            html += `
                <div class="candidate-standing-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
                        <span style="font-weight: 600; font-size: 1.05rem;">${c.nama}</span>
                        <span style="font-weight: 700; color: ${barColor}; font-size: 1.1rem;">${pct}% <span style="font-size:0.8rem; font-weight:500; color:var(--text-muted);">(${count} votes)</span></span>
                    </div>
                    <div style="background: #e2e8f0; border-radius: 999px; height: 12px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                        <div style="background: ${barColor}; height: 100%; width: ${pct}%; border-radius: 999px; transition: width 1s ease-out;"></div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
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
            
            if (res.data.logs) {
                renderAuditLogs(res.data.logs);
            }
        }

        // Load Standings (Skip if verificator)
        if (user.role !== 'admin_verificator') {
            const resResults = await apiFetch('/result');
            if (resResults && resResults.success) {
                renderStandings(resResults.data);
            }
        }
    };

    // --- FEEDBACK MANAGEMENT & EXCEL EXPORT ---
    const loadFeedbackList = async () => {
        const tableBody = document.getElementById('feedback-list-container');
        if (!tableBody) return;

        try {
            const res = await fetch('/admin/feedback', {
                headers: { 'x-admin-username': user.username }
            });
            const json = await res.json();
            
            if (json.success) {
                // Save globally for export
                window.allFeedbacks = json.data;

                if (json.data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color: var(--text-muted);">No feedback found.</td></tr>';
                    return;
                }

                tableBody.innerHTML = json.data.map(f => `
                    <tr>
                        <td>${new Date(f.createdAt).toLocaleString()}</td>
                        <td><strong>${f.fullName}</strong></td>
                        <td>${f.category}</td>
                        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${f.message}">${f.message}</td>
                        <td>
                            <span style="padding: 2px 8px; border-radius: 999px; font-size: 0.8rem; background: ${f.status === 'replied' ? '#dcfce7' : '#fef3c7'}; color: ${f.status === 'replied' ? '#166534' : '#92400e'};">
                                ${f.status === 'replied' ? 'Replied' : 'Pending'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm-approve" onclick="openReplyModal('${f._id}')" ${f.status === 'replied' ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                                <i class="fas fa-reply"></i> Reply
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (e) {
            console.error('Error loading feedbacks:', e);
        }
    };

    // Modal Logic
    const feedbackModal = document.getElementById('feedback-modal');
    window.openReplyModal = (id) => {
        const feedback = window.allFeedbacks.find(f => f._id === id);
        if (!feedback) return;

        document.getElementById('reply-feedback-id').value = id;
        document.getElementById('modal-feedback-voter').textContent = `From: ${feedback.fullName} (${feedback.category})`;
        document.getElementById('modal-feedback-message').textContent = feedback.message;
        document.getElementById('feedback-reply-text').value = '';
        
        feedbackModal.style.display = 'flex';
    };

    const closeFeedbackBtn = document.getElementById('close-feedback-modal');
    if (closeFeedbackBtn) {
        closeFeedbackBtn.onclick = (e) => {
            e.preventDefault();
            feedbackModal.style.display = 'none';
        };
    }

    const replyForm = document.getElementById('feedback-reply-form');
    if (replyForm) {
        replyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('reply-feedback-id').value;
            const replyMsg = document.getElementById('feedback-reply-text').value;

            const res = await apiFetch('/admin/feedback/reply', {
                method: 'POST',
                headers: { 'x-admin-username': user.username },
                body: JSON.stringify({ feedbackId: id, replyMessage: replyMsg })
            });

            if (res && res.success) {
                showToast('Reply sent successfully!');
                feedbackModal.style.display = 'none';
                loadFeedbackList();
            } else {
                showToast(res.message || 'Failed to send reply', 'error');
            }
        });
    }

    // Export to Excel Logic (using SheetJS from CDN)
    const exportFeedbackBtn = document.getElementById('btn-export-feedback');
    if (exportFeedbackBtn) {
        exportFeedbackBtn.onclick = () => {
            if (!window.allFeedbacks || window.allFeedbacks.length === 0) {
                showToast('No data to export', 'error');
                return;
            }

            // Format data for Excel
            const excelData = window.allFeedbacks.map(f => ({
                'Date Submitted': new Date(f.createdAt).toLocaleString(),
                'Voter Name': f.fullName,
                'Voter Category': f.category,
                'Voter Username': f.userId,
                'Feedback Message': f.message,
                'Status': f.status,
                'Admin Reply': f.reply || '',
                'Replied By': f.repliedBy || '',
                'Reply Date': f.repliedAt ? new Date(f.repliedAt).toLocaleString() : ''
            }));

            // Create Worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);
            // Create Workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "FeedbackData");

            // Generate Excel file and trigger download
            XLSX.writeFile(wb, `Voting_Feedback_${new Date().toISOString().slice(0,10)}.xlsx`);
        };
    }

    loadAdminData();
    loadUserManagement();
    loadWebConfig();
    loadFeedbackList();

    // Hamburger Menu Logic
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navLinks = document.getElementById('nav-links');
    if (hamburgerMenu && navLinks) {
        hamburgerMenu.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        navLinks.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', initAdminPage);
