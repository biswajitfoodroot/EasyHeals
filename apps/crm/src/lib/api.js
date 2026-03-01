import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

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
        return Promise.reject(error);
    }
);

export default api;
export { API_BASE };
