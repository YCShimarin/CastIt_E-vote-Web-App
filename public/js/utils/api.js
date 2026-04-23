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

export { apiFetch, showToast };
