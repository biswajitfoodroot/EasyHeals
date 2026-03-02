import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Bell, Shield, Edit2, Check, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../lib/utils';

export default function Settings() {
    const { user, updateProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);

    // Profile form state
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        phone: user?.phone || ''
    });

    // Password form state
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.patch('/users/me', profileData);
            // Update the user in auth context using the hook method
            updateProfile(response.data);

            toast.success('Profile updated successfully');
            setEditingProfile(false);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            return toast.error('New passwords do not match');
        }
        if (passwords.new.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            toast.success('Password updated successfully');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container max-w-5xl mx-auto pb-10">
            <header className="mb-8">
                <h1 className="page-title text-text">Account Settings</h1>
                <p className="page-subtitle">Manage your profile information and security preferences.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* ─── Navigation ─── */}
                <div className="lg:col-span-3 space-y-1">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'profile'
                            ? 'bg-teal text-white shadow-md shadow-teal/20'
                            : 'text-text2 hover:bg-white hover:shadow-sm'
                            }`}
                    >
                        <User size={18} />
                        Profile Info
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'security'
                            ? 'bg-teal text-white shadow-md shadow-teal/20'
                            : 'text-text2 hover:bg-white hover:shadow-sm'
                            }`}
                    >
                        <Shield size={18} />
                        Security
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'notifications'
                            ? 'bg-teal text-white shadow-md shadow-teal/20'
                            : 'text-text2 hover:bg-white hover:shadow-sm'
                            }`}
                    >
                        <Bell size={18} />
                        Notifications
                    </button>
                </div>

                {/* ─── Tabs Content ─── */}
                <div className="lg:col-span-9 space-y-6">

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="card animate-scale-in">
                            <div className="card-header flex items-center justify-between">
                                <h2 className="text-lg font-bold text-text flex items-center gap-2">
                                    <User size={20} className="text-teal" />
                                    Profile Information
                                </h2>
                                {!editingProfile ? (
                                    <button
                                        onClick={() => setEditingProfile(true)}
                                        className="btn-secondary btn-sm"
                                    >
                                        <Edit2 size={16} />
                                        Edit Profile
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingProfile(false)}
                                            className="btn-ghost btn-sm text-text2"
                                        >
                                            <X size={16} />
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="form-label">Full Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                disabled={!editingProfile}
                                                value={profileData.name}
                                                onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                                                placeholder="Enter your name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="form-label">Email Address</label>
                                            <input
                                                type="email"
                                                className="form-input opacity-70"
                                                disabled
                                                value={user?.email || ''}
                                            />
                                            <p className="text-[10px] text-muted italic">Email cannot be changed.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="form-label">Phone Number</label>
                                            <input
                                                type="tel"
                                                className="form-input"
                                                disabled={!editingProfile}
                                                value={profileData.phone}
                                                onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                                                placeholder="Enter phone number"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="form-label">Role</label>
                                            <div className="inline-flex items-center px-3 py-2 rounded-lg bg-teal-pale text-teal text-sm font-bold border border-teal/10 capitalize">
                                                {user?.role}
                                            </div>
                                        </div>
                                    </div>

                                    {editingProfile && (
                                        <div className="flex justify-end pt-4 border-t border-border mt-6">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn-primary"
                                            >
                                                {loading ? 'Saving...' : <><Check size={18} /> Save Changes</>}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                        <div className="card animate-scale-in">
                            <div className="card-header">
                                <h2 className="text-lg font-bold text-text flex items-center gap-2">
                                    <Shield size={20} className="text-teal" />
                                    Change Password
                                </h2>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
                                    <div className="space-y-2">
                                        <label className="form-label">Current Password</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                            <input
                                                type="password"
                                                required
                                                className="form-input pl-10"
                                                placeholder="••••••••"
                                                value={passwords.current}
                                                onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="form-label">New Password</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                            <input
                                                type="password"
                                                required
                                                className="form-input pl-10"
                                                placeholder="Min 6 characters"
                                                value={passwords.new}
                                                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="form-label">Confirm New Password</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                            <input
                                                type="password"
                                                required
                                                className="form-input pl-10"
                                                placeholder="Repeat new password"
                                                value={passwords.confirm}
                                                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="btn-primary px-8"
                                        >
                                            {loading ? 'Updating...' : <><Save size={18} /> Update Password</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (
                        <div className="card animate-scale-in">
                            <div className="card-header">
                                <h2 className="text-lg font-bold text-text flex items-center gap-2">
                                    <Bell size={20} className="text-teal" />
                                    Notification Preferences
                                </h2>
                            </div>
                            <div className="card-body py-10 text-center">
                                <div className="w-16 h-16 bg-teal-pale rounded-full flex items-center justify-center text-teal mx-auto mb-4">
                                    <Settings size={32} />
                                </div>
                                <h3 className="text-lg font-semibold text-text mb-2">Coming Soon</h3>
                                <p className="text-muted text-sm max-w-sm mx-auto">
                                    We're working on highly customizable notification settings to keep you informed about leads and tasks.
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
