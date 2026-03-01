import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import { USER_ROLES } from '../lib/constants';
import { formatDateTime } from '../lib/utils';
import { Plus, Shield, UserCog, Edit3, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [showResetPwd, setShowResetPwd] = useState(null);
    const [newPwd, setNewPwd] = useState('');

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users').then(r => r.data),
    });

    const resetPwd = useMutation({
        mutationFn: ({ userId, newPassword }) => api.post(`/users/${userId}/reset-password`, { newPassword }),
        onSuccess: () => { toast.success('Password reset'); setShowResetPwd(null); setNewPwd(''); },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
    });

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage CRM user accounts and roles</p>
                </div>
                <button onClick={() => { setEditUser(null); setShowModal(true); }} className="btn-primary btn-sm">
                    <Plus size={14} /> Add User
                </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">Only <strong>Owner</strong> and <strong>Admin</strong> roles can access this page and manage users.</div>
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)
                ) : users.map(user => {
                    const roleConfig = USER_ROLES.find(r => r.value === user.role);
                    return (
                        <div key={user.id} className="card p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-teal/10 text-teal rounded-xl flex items-center justify-center font-bold text-lg uppercase shrink-0">
                                {user.name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{user.name}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleConfig?.bgClass || ''}`}>{roleConfig?.label || user.role}</span>
                                    {!user.isActive && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">Inactive</span>}
                                </div>
                                <div className="text-sm text-muted">{user.email}</div>
                                {user.lastLoginAt && <div className="text-xs text-muted mt-1">Last login: {formatDateTime(user.lastLoginAt)}</div>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => { setEditUser(user); setShowModal(true); }} className="btn-icon" title="Edit"><Edit3 size={14} className="text-muted" /></button>
                                <button onClick={() => setShowResetPwd(user)} className="btn-icon" title="Reset Password"><Lock size={14} className="text-muted" /></button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && <UserFormModal user={editUser} onClose={() => { setShowModal(false); setEditUser(null); }} />}

            {/* Reset Password Modal */}
            <Modal isOpen={!!showResetPwd} onClose={() => setShowResetPwd(null)} title={`Reset Password — ${showResetPwd?.name}`} size="sm"
                footer={<><button onClick={() => setShowResetPwd(null)} className="btn-secondary">Cancel</button><button onClick={() => resetPwd.mutate({ userId: showResetPwd.id, newPassword: newPwd })} disabled={!newPwd || newPwd.length < 6} className="btn-primary">Reset</button></>}>
                <div>
                    <label className="form-label">New Password</label>
                    <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="form-input" placeholder="Min 6 characters" minLength={6} />
                </div>
            </Modal>
        </div>
    );
}

function UserFormModal({ user, onClose }) {
    const queryClient = useQueryClient();
    const isEdit = !!user;
    const [form, setForm] = useState(user || { name: '', email: '', password: '', role: 'advisor', phone: '' });

    const mutation = useMutation({
        mutationFn: (data) => isEdit ? api.patch(`/users/${user.id}`, data) : api.post('/users', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success(isEdit ? 'Updated' : 'User created'); onClose(); },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
    });

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <Modal isOpen={true} onClose={onClose} title={`${isEdit ? 'Edit' : 'Add'} User`} size="md"
            footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Saving...' : 'Save'}</button></>}>
            <div className="space-y-4">
                <div><label className="form-label">Name *</label><input value={form.name} onChange={(e) => update('name', e.target.value)} className="form-input" required /></div>
                <div><label className="form-label">Email *</label><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="form-input" required disabled={isEdit} /></div>
                {!isEdit && (
                    <div><label className="form-label">Password *</label><input type="password" value={form.password || ''} onChange={(e) => update('password', e.target.value)} className="form-input" placeholder="Min 6 characters" required /></div>
                )}
                <div><label className="form-label">Role</label>
                    <select value={form.role} onChange={(e) => update('role', e.target.value)} className="form-select">
                        {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.description}</option>)}
                    </select>
                </div>
                <div><label className="form-label">Phone</label><input value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} className="form-input" /></div>
                {isEdit && (
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold">Active</label>
                        <button onClick={() => update('isActive', !form.isActive)}
                            className={`w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-teal' : 'bg-gray-300'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
