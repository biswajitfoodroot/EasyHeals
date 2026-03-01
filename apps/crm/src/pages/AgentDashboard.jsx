import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import useAuth from '../hooks/useAuth';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { getStatusConfig, getVerificationConfig } from '../lib/constants';
import { Plus, Search, LogOut, Eye, Clock, CheckCircle, XCircle, Key } from 'lucide-react';

export default function AgentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [showChangePwd, setShowChangePwd] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['agent-leads', search, page],
        queryFn: () => api.get('/agent-portal/leads', { params: { search, page, limit: 20 } }).then(r => r.data),
    });

    const leads = data?.data || [];
    const totalPages = data?.totalPages || 1;

    const stats = {
        total: data?.total || 0,
        pending: leads.filter(l => l.verificationStatus === 'pending').length,
        accepted: leads.filter(l => l.verificationStatus === 'accepted').length,
        rejected: leads.filter(l => l.verificationStatus === 'rejected').length,
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center text-lg">🩺</div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">Agent Portal</h1>
                            <p className="text-xs text-slate-500">Welcome, {user?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowChangePwd(true)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal transition-colors px-3 py-2 rounded-lg hover:bg-teal/5">
                            <Key size={16} /> Change Password
                        </button>
                        <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                        <div className="text-xs text-slate-500 mt-1">Total Leads</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-amber-600" />
                            <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
                        </div>
                        <div className="text-xs text-amber-600 mt-1">Pending Verification</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-600" />
                            <div className="text-2xl font-bold text-green-700">{stats.accepted}</div>
                        </div>
                        <div className="text-xs text-green-600 mt-1">Accepted</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center gap-2">
                            <XCircle size={16} className="text-red-600" />
                            <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
                        </div>
                        <div className="text-xs text-red-600 mt-1">Rejected</div>
                    </div>
                </div>

                {/* Search + Add */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="form-input pl-10"
                            placeholder="Search by name, phone, or reference..."
                        />
                    </div>
                    <button
                        onClick={() => navigate('/agent/leads/new')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-teal text-white rounded-xl font-semibold text-sm hover:bg-teal-600 transition-colors shrink-0"
                    >
                        <Plus size={16} /> Add Lead
                    </button>
                </div>

                {/* Leads Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400">Loading...</div>
                    ) : leads.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-4xl mb-3">📋</div>
                            <h3 className="font-semibold text-slate-700">No leads yet</h3>
                            <p className="text-sm text-slate-400 mt-1">Click "Add Lead" to submit your first patient referral</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Ref</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient Name</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Phone</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Verification</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-600">View</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {leads.map((lead) => {
                                        const statusConf = getStatusConfig(lead.status);
                                        const verConf = getVerificationConfig(lead.verificationStatus);
                                        return (
                                            <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{lead.refId}</td>
                                                <td className="px-4 py-3 font-semibold text-slate-800">{lead.name}</td>
                                                <td className="px-4 py-3 text-slate-600">{lead.countryCode} {lead.phone}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConf.bgClass}`}>
                                                        {statusConf.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${verConf.bgClass}`}>
                                                        {verConf.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => navigate(`/agent/leads/${lead.id}`)}
                                                        className="p-1.5 hover:bg-teal/10 rounded-lg text-teal transition-colors"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-white">Prev</button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 hover:bg-white">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showChangePwd && (
                <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
            )}
        </div>
    );
}

function ChangePasswordModal({ onClose }) {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const mutation = useMutation({
        mutationFn: (data) => api.post('/agent-portal/change-password', data),
        onSuccess: () => {
            toast.success('Password updated successfully');
            onClose();
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to update password'),
    });

    const handleAction = () => {
        if (form.newPassword !== form.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        mutation.mutate({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword
        });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Change Portal Password" size="sm"
            footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleAction} disabled={!form.currentPassword || !form.newPassword || form.newPassword.length < 6 || mutation.isPending} className="btn-primary">{mutation.isPending ? 'Updating...' : 'Update Password'}</button></>}>
            <div className="space-y-4">
                <div>
                    <label className="form-label">Current Password</label>
                    <input type="password" value={form.currentPassword} onChange={(e) => setForm(f => ({ ...f, currentPassword: e.target.value }))} className="form-input" placeholder="Enter current password" />
                </div>
                <div>
                    <label className="form-label">New Password (min 6 chars)</label>
                    <input type="password" value={form.newPassword} onChange={(e) => setForm(f => ({ ...f, newPassword: e.target.value }))} className="form-input" placeholder="Set new password" />
                </div>
                <div>
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className="form-input" placeholder="Confirm new password" />
                </div>
            </div>
        </Modal>
    );
}
