import { getCurrencySymbol, COUNTRY_CODES } from './constants';

/**
 * Merge classnames, filtering out falsy values
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

/**
 * Format phone number for display: +91 98765 43210
 */
export function formatPhone(countryCode, phone) {
    if (!phone) return '';
    const cc = countryCode || '+91';
    const clean = phone.replace(/\D/g, '');
    return `${cc} ${clean}`;
}

/**
 * Generate tel: URL for click-to-call
 */
export function getTelUrl(countryCode, phone) {
    if (!phone) return '#';
    const cc = (countryCode || '+91').replace('+', '');
    const clean = phone.replace(/\D/g, '');
    return `tel:+${cc}${clean}`;
}

/**
 * Generate WhatsApp deep link with pre-filled message
 */
export function getWhatsAppUrl(countryCode, phone, message = '') {
    if (!phone) return '#';
    const cc = (countryCode || '+91').replace('+', '');
    const clean = phone.replace(/\D/g, '');
    const encodedMsg = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${cc}${clean}${encodedMsg}`;
}

/**
 * Format currency amount: ₹1,25,000.00
 */
export function formatCurrency(amount, currency = 'INR') {
    if (!amount && amount !== 0) return '';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const symbol = getCurrencySymbol(currency);

    if (currency === 'INR') {
        // Indian numbering system
        return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format date for display
 */
export function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

/**
 * Format date+time for display
 */
export function formatDateTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/**
 * Relative time: "2 hours ago", "3 days ago"
 */
export function timeAgo(date) {
    if (!date) return '';
    const now = new Date();
    const past = new Date(date);
    const seconds = Math.floor((now - past) / 1000);

    const intervals = [
        { label: 'y', seconds: 31536000 },
        { label: 'mo', seconds: 2592000 },
        { label: 'd', seconds: 86400 },
        { label: 'h', seconds: 3600 },
        { label: 'm', seconds: 60 },
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) return `${count}${interval.label} ago`;
    }
    return 'Just now';
}

/**
 * Get country flag emoji from country code
 */
export function getCountryFlag(countryCode) {
    const found = COUNTRY_CODES.find(c => c.code === countryCode);
    return found?.flag || '🌍';
}

/**
 * Truncate text to max length
 */
export function truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text || '';
    return text.slice(0, maxLength) + '…';
}

/**
 * Get user initials for avatar
 */
export function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Download data as CSV file
 */
export function downloadCSV(csvContent, filename = 'export.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Debounce function for search inputs
 */
export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Safely extract a string error message from an Axios error or any error object.
 * Prevents React error #31 by ensuring toast.error() always receives a string.
 * @param {*} err - The error object (typically from Axios catch)
 * @param {string} fallback - Default message if extraction fails
 * @returns {string}
 */
export function getErrorMessage(err, fallback = 'Something went wrong') {
    // Handle validation error details if provided
    const details = err?.response?.data?.details;
    if (Array.isArray(details) && details.length > 0) {
        // Return first error: "Field Name: Error message"
        const first = details[0];
        return `${first.field}: ${first.message}`;
    }

    // Try err.response.data.error first (our API convention)
    const apiError = err?.response?.data?.error;
    if (typeof apiError === 'string') return apiError;
    // If apiError is an object (e.g. DB error {code, message}), extract message
    if (apiError && typeof apiError === 'object') return apiError.message || fallback;

    // Try err.response.data.message
    const apiMessage = err?.response?.data?.message;
    if (typeof apiMessage === 'string') return apiMessage;

    // Try err.message (Axios network errors)
    if (typeof err?.message === 'string') return err.message;

    return fallback;
}
