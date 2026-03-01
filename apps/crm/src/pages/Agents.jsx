import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import PhoneLink from '../components/ui/PhoneLink';
import { COUNTRY_CODES } from '../lib/constants';
import { Plus, Search, Edit3, Trash2, Briefcase, Users, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Agents() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editAgent, setEditAgent] = useState(null);

    const { data: agentsRes, isLoading } = useQuery({
        queryKey: ['agents', search],
        queryFn: () => api.get('/agents', { params: { search: search || undefined } }).then(r => r.data),
    });

    const agents = agentsRes?.data || [];

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/agents/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agent deactivated'); },
    });

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title">Agents & Referrers</h1>
                    <p className="page-subtitle">Manage your agent network</p>
                </div>
                <button onClick={() => { setEditAgent(null); setShowModal(true); }} className="btn-primary btn-sm">
                    <Plus size={14} /> Add Agent
                </button>
            </div>

            <div className="relative mb-4 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents..." className="form-input pl-10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 w-full rounded-2xl" />)
                ) : agents.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted">No agents found</div>
                ) : (
                    agents.map(agent => (
                        <div key={agent.id} className="card p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                                        <Briefcase size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold">{agent.name}</div>
                                        {agent.companyName && <div className="text-xs text-muted">{agent.companyName}</div>}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditAgent(agent); setShowModal(true); }} className="btn-icon"><Edit3 size={14} className="text-muted" /></button>
                                    <button onClick={() => { if (confirm('Deactivate?')) deleteMutation.mutate(agent.id); }} className="btn-icon"><Trash2 size={14} className="text-red-400" /></button>
                                </div>
                            </div>

                            {agent.phone && (
                                <div className="mb-3">
                                    <PhoneLink countryCode={agent.countryCode} phone={agent.phone} />
                                </div>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted">
                                {agent.country && <span>📍 {agent.country}</span>}
                                {agent.email && <span>✉️ {agent.email}</span>}
                            </div>

                            {agent.commissionType && (
                                <div className="mt-3 pt-3 border-t border-border text-xs">
                                    <span className="font-bold text-teal">
                                        Commission: {agent.commissionValue}{agent.commissionType === 'percentage' ? '%' : ' (fixed)'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <AgentFormModal agent={editAgent} onClose={() => { setShowModal(false); setEditAgent(null); }} />
            )}
        </div>
    );
}

function AgentFormModal({ agent, onClose }) {
    const queryClient = useQueryClient();
    const isEdit = !!agent;
    const [form, setForm] = useState(agent || { name: '', countryCode: '+91' });

    const mutation = useMutation({
        mutationFn: (data) => isEdit ? api.patch(`/agents/${agent.id}`, data) : api.post('/agents', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agents'] }); toast.success(isEdit ? 'Updated' : 'Created'); onClose(); },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
    });

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <Modal isOpen={true} onClose={onClose} title={`${isEdit ? 'Edit' : 'Add'} Agent`} size="lg"
            footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Saving...' : 'Save'}</button></>}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Name *</label><input value={form.name || ''} onChange={(e) => update('name', e.target.value)} className="form-input" required /></div>
                    <div><label className="form-label">Company</label><input value={form.companyName || ''} onChange={(e) => update('companyName', e.target.value)} className="form-input" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div><label className="form-label">Code</label>
                        <select value={form.countryCode || '+91'} onChange={(e) => update('countryCode', e.target.value)} className="form-select">
                            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2"><label className="form-label">Phone</label><input value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} className="form-input" /></div>
                </div>
                <div><label className="form-label">Email</label><input type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} className="form-input" /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Country</label><input value={form.country || ''} onChange={(e) => update('country', e.target.value)} className="form-input" /></div>
                    <div><label className="form-label">City</label><input value={form.city || ''} onChange={(e) => update('city', e.target.value)} className="form-input" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Commission Type</label>
                        <select value={form.commissionType || ''} onChange={(e) => update('commissionType', e.target.value || null)} className="form-select">
                            <option value="">None</option>
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                        </select>
                    </div>
                    <div><label className="form-label">Commission Value</label><input value={form.commissionValue || ''} onChange={(e) => update('commissionValue', e.target.value)} className="form-input" placeholder="e.g. 10" /></div>
                </div>
                <div><label className="form-label">PAN Number</label><input value={form.panNumber || ''} onChange={(e) => update('panNumber', e.target.value)} className="form-input" /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Bank Name</label><input value={form.bankName || ''} onChange={(e) => update('bankName', e.target.value)} className="form-input" /></div>
                    <div><label className="form-label">Bank Account</label><input value={form.bankAccount || ''} onChange={(e) => update('bankAccount', e.target.value)} className="form-input" /></div>
                </div>
                <div><label className="form-label">Notes</label><textarea rows={3} value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} className="form-textarea" /></div>
            </div>
        </Modal>
    );
}
