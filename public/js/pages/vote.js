import { apiFetch, showToast } from '../utils/api.js';
import { createCandidateCard } from '../components/candidateCard.js';

const initVotePage = async () => {
    // 1. Sync check to ensure user data is fresh
    await apiFetch('/result'); 
    
    let user = JSON.parse(localStorage.getItem('user'));
    if (!user) { window.location.href = 'index.html'; return; }

    // Redirect admins and verificators to admin dashboard
    if (user.role === 'admin' || user.role === 'admin_verificator') {
        window.location.href = 'admin.html';
        return;
    }

    const isAdmin = false; // No longer needed on this page as admins are redirected
    let chartInstance = null;
    let votingOpenState = false;

    // Greeting
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) greetingEl.textContent = `Hello, ${user.fullName || user.username} 👋`;

    // Voted banner
    if (user.has_voted) {
        const banner = document.getElementById('voted-banner');
        if (banner) banner.style.display = 'flex';
    }

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        if (user.sessionToken) {
            await apiFetch('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ sessionToken: user.sessionToken })
            });
        }
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // --- CHART LOGIC ---
    const renderChart = (candidates, voteCounts) => {
        const canvas = document.getElementById('resultsChart');
        if (!canvas) {
            console.warn('Canvas "resultsChart" not found.');
            return;
        }

        const ctx = canvas.getContext('2d');
        const labels = candidates.map(c => c.nama);
        const data = candidates.map(c => {
            const entry = voteCounts[c.id];
            return (typeof entry === 'object') ? entry.count : (entry || 0);
        });

        // Ensure Chart library is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded.');
            return;
        }

        if (chartInstance) chartInstance.destroy();

        const colors = ['#16a34a', '#22c55e', '#4ade80', '#2563eb', '#8b5cf6', '#f59e0b', '#ef4444'];

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.slice(0, candidates.length),
                    borderWidth: 3,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000 },
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            font: { family: 'Outfit', size: 11 },
                            padding: 15,
                            boxWidth: 10
                        } 
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                                return ` ${context.parsed} votes (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '60%',
                layout: {
                    padding: { bottom: 10 }
                }
            }
        });
    };

    const renderResults = (data) => {
        if (!data) return;
        const { stats, candidates, voteCounts, voting_open } = data;
        votingOpenState = voting_open;

        // Sync local user status with current data results
        const freshUser = JSON.parse(localStorage.getItem('katua_users') || '[]')
                         .find(u => u.username?.toLowerCase() === user.username?.toLowerCase());
        if (freshUser && (freshUser.has_voted !== user.has_voted)) {
            user.has_voted = freshUser.has_voted;
            user.vote = freshUser.vote;
            localStorage.setItem('user', JSON.stringify(user));
            if (user.has_voted) document.getElementById('voted-banner').style.display = 'flex';
        }

        // Stats UI
        if (stats) {
            const counterEl = document.getElementById('ui-counter');
            const progressBar = document.getElementById('progress-bar');
            if (counterEl) counterEl.textContent = `${stats.totalVoted || 0} / ${stats.totalUsers || 0} have voted (${stats.progressPercentage || 0}%)`;
            if (progressBar) progressBar.style.width = `${stats.progressPercentage || 0}%`;
            
            const totalUsersEl = document.getElementById('stat-total-users');
            const totalVotedEl = document.getElementById('stat-total-voted');
            const notVotedEl = document.getElementById('stat-not-voted');
            if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;
            if (totalVotedEl) totalVotedEl.textContent = stats.totalVoted || 0;
            if (notVotedEl) notVotedEl.textContent = stats.notVoted || 0;
        }

        const closedBanner = document.getElementById('voting-closed-banner');
        if (closedBanner) closedBanner.style.display = voting_open ? 'none' : 'flex';

        // Candidates Cards
        const container = document.getElementById('candidates-container');
        if (container && candidates) {
            container.innerHTML = '';
            candidates.forEach(c => {
                const card = createCandidateCard(c, handleVote, user.has_voted || !voting_open, user.vote);
                container.appendChild(card);
            });
        }

        // --- Admin Specific UI ---
        if (isAdmin) {
            const adminPanel = document.getElementById('admin-controls');
            const toggleBtn = document.getElementById('admin-toggle-btn');
            if (adminPanel) adminPanel.style.display = 'block';
            if (toggleBtn) {
                if (voting_open) {
                    toggleBtn.className = 'btn btn-danger';
                    toggleBtn.style.backgroundColor = '#ef4444';
                    toggleBtn.innerHTML = '<i class="fas fa-lock"></i> Close Voting';
                } else {
                    toggleBtn.className = 'btn btn-primary';
                    toggleBtn.style.backgroundColor = 'var(--primary)';
                    toggleBtn.innerHTML = '<i class="fas fa-unlock"></i> Open Voting';
                }
            }
        }

        // Pie Chart
        if (candidates && voteCounts) renderChart(candidates, voteCounts);
    };

    const handleVote = async (id) => {
        if (user.has_voted) return; // Client-side guard
        
        try {
            const res = await apiFetch('/vote', {
                method: 'POST',
                body: JSON.stringify({ username: user.username, pilihan: id })
            });

            if (res.success) {
                showToast('Vote successfully recorded!');
                user.has_voted = true;
                user.vote = id;
                localStorage.setItem('user', JSON.stringify(user));
                
                const banner = document.getElementById('voted-banner');
                if (banner) banner.style.display = 'flex';
                
                fetchData();
            } else {
                showToast(res.message, 'error');
            }
        } catch (error) {
            showToast('Failed to cast vote', 'error');
        }
    };

    const fetchData = async () => {
        try {
            const res = await apiFetch('/result');
            if (res && res.success) renderResults(res.data);
        } catch (error) {
            console.error('Data loading error:', error);
        }
    };

    // Initial load
    fetchData();

    // Auto-refresh stats every 30 seconds (optional)
    // setInterval(fetchData, 30000);
};

document.addEventListener('DOMContentLoaded', initVotePage);
