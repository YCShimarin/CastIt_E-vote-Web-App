import { apiFetch, showToast } from '../utils/api.js';

const loadConfig = async () => {
    try {
        const response = await fetch('/web_config.json');
        if (!response.ok) return;
        const config = await response.json();
        
        // Update texts
        if (config.website) {
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.textContent = config.website.title || config.website.name;
            
            const pageDesc = document.getElementById('page-description');
            if (pageDesc) pageDesc.content = config.website.description;

            const navTitle = document.getElementById('nav-title');
            if (navTitle) navTitle.textContent = config.website.name;
            
            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) heroTitle.innerHTML = `Choose The Next <span>${config.website.name}</span> Leader`;
            
            const footerLogoText = document.getElementById('footer-logo-text');
            if (footerLogoText) footerLogoText.textContent = config.website.name;

            const navLogo = document.getElementById('nav-logo');
            const footerLogo = document.getElementById('footer-logo-img');
            if (navLogo && config.website.logo_path) navLogo.src = config.website.logo_path;
            if (footerLogo && config.website.logo_path) footerLogo.src = config.website.logo_path;

            const favicon = document.getElementById('favicon');
            if (favicon && config.website.logo_path) favicon.href = config.website.logo_path;
        }

        // Populate Categories
        if (config.categories) {
            const hdJurusan = document.getElementById('hd-category');
            if (hdJurusan) {
                config.categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    hdJurusan.appendChild(opt);
                });
            }
        }

        if (config.additional_settings) {
            const footerText = document.getElementById('footer-text');
            if (footerText && config.additional_settings.footer_text) footerText.textContent = config.additional_settings.footer_text;
        }

        // Update candidates
        if (config.candidates && config.candidates.list) {
            const candidatesContainer = document.getElementById('candidates-container');
            if (candidatesContainer) {
                candidatesContainer.innerHTML = ''; // clear hardcoded
                config.candidates.list.forEach(candidate => {
                    const card = document.createElement('div');
                    card.className = 'candidate-card';
                    card.innerHTML = `
                        <img src="${candidate.image_path}" alt="${candidate.name}" class="candidate-img">
                        <div class="candidate-info">
                            <span class="candidate-tag">Candidate 0${candidate.id}</span>
                            <h3 style="margin-top: 10px;">${candidate.name}</h3>
                            <p style="color: var(--text-muted); font-size: 0.875rem;">${candidate.description}</p>
                        </div>
                    `;
                    candidatesContainer.appendChild(card);
                });
            }
        }
    } catch (err) {
        console.error('Failed to load web_config.json', err);
    }
};

const initLandingPage = () => {
    loadConfig();
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
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            const username = e.target.username.value.trim();
            const password = e.target.password.value;

            try {
                const res = await apiFetch('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ username, password })
                });

                if (res.success) {
                    localStorage.setItem('user', JSON.stringify(res.data));
                    showToast('Login successful!');
                    setTimeout(() => {
                        const isAdmin = res.data.role === 'admin' || res.data.role === 'admin_verificator';
                        window.location.href = isAdmin ? 'admin.html' : 'vote.html';
                    }, 800);
                } else {
                    showToast(res.message || 'Login failed', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login Now';
                }
            } catch (error) {
                showToast('System error occurred', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login Now';
            }
        });
    }

    const helpdeskForm = document.getElementById('helpdesk-form');
    if (helpdeskForm) {
        helpdeskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('helpdesk-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            const formData = {
                fullName: document.getElementById('hd-fullName').value,
                idNumber: document.getElementById('hd-idNumber').value,
                batch: document.getElementById('hd-batch').value,
                category: document.getElementById('hd-category').value,
                email: document.getElementById('hd-email').value
            };

            try {
                const res = await apiFetch('/helpdesk', { 
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                const errorDiv = document.getElementById('helpdesk-error');
                const successDiv = document.getElementById('helpdesk-success');
                
                if (errorDiv) errorDiv.style.display = 'none';
                if (successDiv) successDiv.style.display = 'none';

                if (res.success) {
                    helpdeskForm.reset();
                    if (successDiv) successDiv.style.display = 'block';
                    showToast('Support request sent successfully!');
                } else {
                    if (errorDiv) {
                        const errorMsg = document.getElementById('helpdesk-error-msg');
                        if (errorMsg) errorMsg.textContent = res.message;
                        errorDiv.style.display = 'block';
                    }
                    showToast(res.message, 'error');
                }
            } catch (error) {
                showToast('Failed to send request', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
            }
        });
    }

    // Hamburger Menu Logic
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navLinks = document.getElementById('nav-links');
    if (hamburgerMenu && navLinks) {
        hamburgerMenu.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', initLandingPage);
