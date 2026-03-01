import { create } from 'zustand';
import api from '../lib/api';

const useAuth = create((set, get) => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,

    get isAuthenticated() {
        return !!get().token;
    },

    get isOwner() {
        return get().user?.role === 'owner';
    },

    get isAdmin() {
        return get().user?.role === 'owner' || get().user?.role === 'admin';
    },

    get canManageUsers() {
        return get().user?.canManageUsers || get().isAdmin;
    },

    hasPermission: (section) => {
        const user = get().user;
        if (!user) return false;
        // Owner and admin always have full access
        if (user.role === 'owner' || user.role === 'admin') return true;
        // Check permissions JSON
        if (!user.permissions) return false;
        return user.permissions[section] === true;
    },

    login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ token, user });
        return res.data;
    },

    setup: async (name, email, password) => {
        const res = await api.post('/auth/setup', { name, email, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ token, user });
        return res.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null });
        window.location.href = '/login';
    },

    updateProfile: (userData) => {
        const updatedUser = { ...get().user, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
    },

    changePassword: async (currentPassword, newPassword) => {
        await api.post('/auth/change-password', { currentPassword, newPassword });
    },
}));

export default useAuth;
