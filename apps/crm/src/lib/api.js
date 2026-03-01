import axios from 'axios';

const isProd = import.meta.env.PROD;
const API_BASE = import.meta.env.VITE_API_URL || (isProd ? '/v1' : 'http://localhost:3000/v1');

const api = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            const isAgentPath = window.location.pathname.startsWith('/agent');
            const loginPath = isAgentPath ? '/agent/login' : '/login';
            if (window.location.pathname !== '/login' && window.location.pathname !== '/agent/login') {
                window.location.href = loginPath;
            }
        }

        // Safety net: Ensure error.response.data.error is always a string
        // This prevents React error #31 if a non-string value reaches toast.error()
        if (error.response?.data?.error && typeof error.response.data.error !== 'string') {
            error.response.data.error =
                error.response.data.error.message || 'An unexpected error occurred';
        }

        return Promise.reject(error);
    }
);

export default api;
export { API_BASE };
