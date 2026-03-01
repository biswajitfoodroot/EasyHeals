import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import { USER_ROLES, PERMISSION_SECTIONS } from '../lib/constants';
import { formatDateTime, getErrorMessage } from '../lib/utils';
import { Plus, Shield, UserCog, Edit3, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_PERMISSIONS = {
    dashboard: true, leads: true, pipeline: true, agents: false,
    masters: false, invoices: false, reports: false, whatsapp: true,
    archive: false, closed_cases: true, users: false,
};

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
        onError: (err) => toast.error(getErrorMessage(err, 'Failed')),
    });

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title">User & Access Management</h1>
                    <p className="page-subtitle">Manage accounts, roles, and section-level permissions</p>
                </div>
                <button onClick={() => { setEditUser(null); setShowModal(true); }} className="btn-primary btn-sm">
                    <Plus size={14} /> Add User
                </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">Only <strong>Owner</strong> and <strong>Admin</strong> roles can access this page. Advisors and Viewers are restricted to their assigned sections.</div>
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)
                ) : users.map(user => {
                    const roleConfig = USER_ROLES.find(r => r.value === user.role);
                    const isAdminRole = user.role === 'owner' || user.role === 'admin';
                    return (
                        <div key={user.id} className="card p-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-teal/10 text-teal rounded-xl flex items-center justify-center font-bold text-lg uppercase shrink-0">
                                    {user.name?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
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

                            {/* Permissions Preview for non-admin */}
                            {!isAdminRole && user.permissions && (
                                <div className="mt-3 pt-3 border-t border-border">
                                    <div className="text-[10px] font-bold text-muted uppercase mb-2">Section Access</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(user.permissions)
                                            .filter(([, v]) => v)
                                            .map(([key]) => (
                                                <span key={key} className="px-2 py-0.5 bg-teal/10 text-teal text-[10px] font-bold rounded-full capitalize">
                                                    {key.replace(/_/g, ' ')}
                                                </span>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                            {isAdminRole && (
                                <div className="mt-3 pt-3 border-t border-border">
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">Full Access</span>
                                </div>
                            )}
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

    const initialPermissions = user?.permissions || { ...DEFAULT_PERMISSIONS };
    const [form, setForm] = useState(user || { name: '', email: '', password: '', role: 'advisor', phone: '' });
    const [permissions, setPermissions] = useState(initialPermissions);

    const isAdminRole = form.role === 'owner' || form.role === 'admin';

    const mutation = useMutation({
        mutationFn: (data) => isEdit ? api.patch(`/users/${user.id}`, data) : api.post('/users', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success(isEdit ? 'Updated' : 'User created'); onClose(); },
        onError: (err) => toast.error(getErrorMessage(err, 'Failed')),
    });

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const togglePermission = (key) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        const data = {
            ...form,
            permissions: isAdminRole ? null : permissions,
        };
        mutation.mutate(data);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`${isEdit ? 'Edit' : 'Add'} User`} size="lg"
            footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Saving...' : 'Save'}</button></>}>
            <div className="space-y-5">
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

                {/* Permissions Grid */}
                {!isAdminRole && (
                    <div className="border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield size={16} className="text-teal" />
                            <h4 className="font-bold text-sm">Section Access Permissions</h4>
                        </div>
                        <p className="text-xs text-muted mb-4">Toggle which CRM sections this user can access.</p>

                        {PERMISSION_SECTIONS.map(group => (
                            <div key={group.group} className="mb-4 last:mb-0">
                                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">{group.group}</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {group.items.map(item => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => togglePermission(item.key)}
                                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition-all ${permissions[item.key]
                                                ? 'border-teal bg-teal/5 text-teal'
                                                : 'border-border bg-gray-50 text-muted hover:border-gray-300'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] ${permissions[item.key] ? 'border-teal bg-teal text-white' : 'border-gray-300'
                                                }`}>
                                                {permissions[item.key] && '✓'}
                                            </div>
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {isAdminRole && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="text-sm text-amber-800 font-medium">
                            <Shield size={14} className="inline text-amber-600 mr-1" />
                            Owner and Admin roles have <strong>full access</strong> to all sections. Permissions are not applicable.
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
