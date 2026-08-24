/**
 * KATUA Unand — API Connector (Node.js Version)
 * 
 * This file handles all communication between the browser and the 
 * Node.js backend. It replaces the previous LocalStorage mock logic.
 */

// Auto-detect API Base URL based on where the app is served
const API_BASE = window.location.origin;

const apiFetch = async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;
    
    // Set default headers for JSON
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `Server error: ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error(`[API Error] ${endpoint}:`, error);
        return { success: false, message: error.message };
    }
};

/**
 * Toast Utility for UI Feedback
 */
const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
};

// --- Heartbeat Logic for Single-Device Login ---
setInterval(async () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.sessionToken) {
                // Send heartbeat silently in the background
                await fetch(`${API_BASE}/auth/heartbeat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionToken: user.sessionToken })
                });
            }
        } catch (e) {
            // Ignore parse errors silently
        }
    }
}, 60000); // 1 minute interval

export { apiFetch, showToast };
