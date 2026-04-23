import { apiFetch, showToast } from '../utils/api.js';

const initLandingPage = () => {
    // Check if user is already logged in
    const user = JSON.parse(localStorage.getItem('user'));

    // Toggle navbar buttons based on login state
    const loginBtn = document.getElementById('nav-login-btn');
    const dashboardBtn = document.getElementById('nav-dashboard-btn');

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (dashboardBtn) dashboardBtn.style.display = 'block';
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (dashboardBtn) dashboardBtn.style.display = 'none';
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

            const username = e.target.username.value.trim();
            const password = e.target.password.value;

            try {
                const res = await apiFetch('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ username, password })
                });

                if (res.success) {
                    localStorage.setItem('user', JSON.stringify(res.data));
                    showToast('Login berhasil!');
                    setTimeout(() => {
                        const isAdmin = res.data.role === 'admin' || res.data.role === 'admin_verificator';
                        window.location.href = isAdmin ? 'admin.html' : 'vote.html';
                    }, 800);
                } else {
                    showToast(res.message || 'Login gagal', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk Sekarang';
                }
            } catch (error) {
                showToast('Terjadi kesalahan sistem', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk Sekarang';
            }
        });
    }

    const helpdeskForm = document.getElementById('helpdesk-form');
    if (helpdeskForm) {
        helpdeskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('helpdesk-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

            const formData = {
                nama: document.getElementById('hd-nama').value,
                nim: document.getElementById('hd-nim').value,
                angkatan: document.getElementById('hd-angkatan').value,
                jurusan: document.getElementById('hd-jurusan').value,
                email: document.getElementById('hd-email').value
            };

            try {
                const res = await apiFetch('/helpdesk', { 
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                if (res.success) {
                    helpdeskForm.reset();
                    document.getElementById('helpdesk-success').style.display = 'block';
                    showToast('Permintaan bantuan berhasil dikirim!');
                }
            } catch (error) {
                showToast('Gagal mengirim permintaan', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Permintaan';
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', initLandingPage);
