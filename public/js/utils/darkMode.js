// Dark Mode Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage for preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Set initial state
    if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
    }

    // Function to add toggle button and event listener
    const initThemeToggle = () => {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        // Check if button already exists to prevent duplicates
        if (document.querySelector('.theme-toggle')) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'theme-toggle';
        toggleBtn.setAttribute('aria-label', 'Toggle Dark Mode');
        toggleBtn.innerHTML = `
            <i class="fas fa-moon"></i>
            <i class="fas fa-sun"></i>
        `;

        // Insert at the beginning of nav-links
        navLinks.insertBefore(toggleBtn, navLinks.firstChild);

        toggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark-mode');
            const isDark = document.documentElement.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
        });
    };

    initThemeToggle();
});
