import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import PhoneLink from '../components/ui/PhoneLink';
import { COUNTRY_CODES } from '../lib/constants';
import { Plus, Search, Edit3, Trash2, Briefcase, X, KeyRound, Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../lib/utils';

export default function Agents() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editAgent, setEditAgent] = useState(null);
    const [loginAgent, setLoginAgent] = useState(null);

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
                                    <button onClick={() => setLoginAgent(agent)} className="btn-icon group" title={agent.hasPortalLogin ? "Manage Portal Access" : "Enable Portal Login"}>
                                        <KeyRound size={14} className={agent.hasPortalLogin ? "text-teal fill-teal/10" : "text-muted hover:text-teal"} />
                                        {agent.hasPortalLogin && <div className="absolute -top-1 -right-1 w-2 h-2 bg-teal rounded-full border border-white" />}
                                    </button>
                                    <button onClick={() => { setEditAgent(agent); setShowModal(true); }} className="btn-icon"><Edit3 size={14} className="text-muted" /></button>
                                    <button onClick={() => { if (confirm('Deactivate?')) deleteMutation.mutate(agent.id); }} className="btn-icon hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                                </div>
                            </div>

                            {/* Multiple phone numbers */}
                            <div className="mb-3 space-y-1">
                                {agent.phoneNumbers && agent.phoneNumbers.length > 0 ? (
                                    agent.phoneNumbers.map((p, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <PhoneLink countryCode={p.countryCode} phone={p.phone} showWhatsApp={true} />
                                            {p.label && p.label !== 'Primary' && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">{p.label}</span>}
                                        </div>
                                    ))
                                ) : agent.phone ? (
                                    <PhoneLink countryCode={agent.countryCode} phone={agent.phone} />
                                ) : null}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted">
                                {agent.country && <span>📍 {agent.country}</span>}
                                {agent.email && <span>✉️ {agent.email}</span>}
                            </div>

                            {agent.hasPortalLogin && agent.portalEmail && (
                                <div className="mt-2 text-[10px] bg-teal/5 text-teal px-2 py-1 rounded-lg border border-teal/10 inline-flex items-center gap-1.5">
                                    <Shield size={10} />
                                    Portal: <strong>{agent.portalEmail}</strong>
                                </div>
                            )}

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
            {loginAgent && (
                <AgentPortalModal agent={loginAgent} onClose={() => setLoginAgent(null)} />
            )}
        </div>
    );
}

function AgentFormModal({ agent, onClose }) {
    const queryClient = useQueryClient();
    const isEdit = !!agent;

    const defaultPhones = agent?.phoneNumbers?.length > 0
        ? agent.phoneNumbers
        : agent?.phone
            ? [{ countryCode: agent.countryCode || '+91', phone: agent.phone, label: 'Primary' }]
            : [{ countryCode: '+91', phone: '', label: 'Primary' }];

    const [form, setForm] = useState(agent || { name: '', countryCode: '+91' });
    const [phoneNumbers, setPhoneNumbers] = useState(defaultPhones);

    const mutation = useMutation({
        mutationFn: (data) => isEdit ? api.patch(`/agents/${agent.id}`, data) : api.post('/agents', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agents'] }); toast.success(isEdit ? 'Updated' : 'Created'); onClose(); },
        onError: (err) => toast.error(getErrorMessage(err, 'Failed')),
    });

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const updatePhone = (i, field, val) => {
        setPhoneNumbers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
    };

    const addPhone = () => {
        setPhoneNumbers(prev => [...prev, { countryCode: '+91', phone: '', label: '' }]);
    };

    const removePhone = (i) => {
        setPhoneNumbers(prev => prev.filter((_, idx) => idx !== i));
    };

    const handleSave = () => {
        const validPhones = phoneNumbers.filter(p => p.phone.trim());
        const data = {
            ...form,
            phoneNumbers: validPhones,
            phone: validPhones[0]?.phone || form.phone,
            countryCode: validPhones[0]?.countryCode || form.countryCode,
        };
        mutation.mutate(data);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`${isEdit ? 'Edit' : 'Add'} Agent`} size="lg"
            footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Saving...' : 'Save'}</button></>}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Name *</label><input value={form.name || ''} onChange={(e) => update('name', e.target.value)} className="form-input" required /></div>
                    <div><label className="form-label">Company</label><input value={form.companyName || ''} onChange={(e) => update('companyName', e.target.value)} className="form-input" /></div>
                </div>

                {/* Phone Numbers Section */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="form-label mb-0">Phone Numbers</label>
                        <button type="button" onClick={addPhone} className="btn-ghost btn-sm text-xs"><Plus size={12} /> Add Number</button>
                    </div>
                    <div className="space-y-2">
                        {phoneNumbers.map((p, i) => (
                            <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl">
                                <select value={p.countryCode || '+91'} onChange={(e) => updatePhone(i, 'countryCode', e.target.value)} className="form-select w-24 text-xs">
                                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                                </select>
                                <input value={p.phone || ''} onChange={(e) => updatePhone(i, 'phone', e.target.value)} className="form-input flex-1" placeholder="Phone number" />
                                <input value={p.label || ''} onChange={(e) => updatePhone(i, 'label', e.target.value)} className="form-input w-24 text-xs" placeholder="Label" />
                                {phoneNumbers.length > 1 && (
                                    <button type="button" onClick={() => removePhone(i)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400"><X size={14} /></button>
                                )}
                            </div>
                        ))}
                    </div>
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

function AgentPortalModal({ agent, onClose }) {
    const hasLogin = !!agent.hasPortalLogin;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const queryClient = useQueryClient();

    // Reset form when modal opens or agent changes
    useEffect(() => {
        if (agent) {
            setEmail(agent.portalEmail || agent.email || '');
            setPassword(hasLogin ? '••••••••' : '');
        }
    }, [agent, hasLogin]);

    const actionMutation = useMutation({
        mutationFn: (data) => api.post(`/agents/${agent.id}/create-login`, data), // handles reset too if implemented that way, but let's be explicit
        onSuccess: () => {
            toast.success(`Portal login updated for ${agent.name}`);
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Failed')),
    });

    const resetMutation = useMutation({
        mutationFn: (data) => api.post(`/agents/${agent.id}/reset-password`, data),
        onSuccess: () => {
            toast.success(`Password reset for ${agent.name}`);
            onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Failed')),
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.delete(`/agents/${agent.id}/portal-login`),
        onSuccess: () => {
            toast.success(`Portal access removed for ${agent.name}`);
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Failed to remove')),
    });

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={hasLogin ? "Manage Portal Access" : "Enable Portal Login"}
            size="sm"
            footer={
                <div className="flex justify-between w-full">
                    {hasLogin ? (
                        <button
                            onClick={() => { if (confirm('Are you sure? This will immediately disable portal access.')) deleteMutation.mutate(); }}
                            className="text-red-500 text-xs font-bold hover:underline"
                        >
                            Revoke Access
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="btn-secondary">Cancel</button>
                        <button
                            onClick={() => {
                                if (hasLogin) resetMutation.mutate({ password });
                                else actionMutation.mutate({ email, password });
                            }}
                            disabled={mutationLocked()}
                            className="btn-primary"
                        >
                            {hasLogin ? 'Update Password' : 'Create Login'}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="text-sm text-center mb-4">
                    <div className="w-12 h-12 bg-teal-pale rounded-full flex items-center justify-center text-teal mx-auto mb-2">
                        <KeyRound size={24} />
                    </div>
                    <p className="font-semibold text-text">{agent.name}</p>
                    <p className="text-xs text-muted">Agent Portal Account</p>
                </div>

                {!hasLogin ? (
                    <div>
                        <label className="form-label">Portal Email (Username)</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-input"
                            placeholder="agent@email.com"
                            autoComplete="off"
                        />
                    </div>
                ) : (
                    <div className="bg-gray-50 p-3 rounded-xl border border-border">
                        <label className="text-[10px] font-bold text-muted uppercase block mb-1">Current Username</label>
                        <div className="font-medium text-sm">{agent.portalEmail}</div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="form-label">{hasLogin ? 'New Password' : 'Password (min 6 chars)'}</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input pr-10"
                            placeholder="Set password"
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                {hasLogin && (
                    <p className="text-[10px] text-muted italic text-center">
                        Updating the password will not affect existing lead data.
                    </p>
                )}
            </div>
        </Modal>
    );

    function mutationLocked() {
        if (actionMutation.isPending || resetMutation.isPending || deleteMutation.isPending) return true;

        // If it's the dummy password, we don't want to allow update
        if (password === '••••••••') return true;

        if (!password || password.length < 6) return true;
        if (!hasLogin && !email) return true;
        return false;
    }
}
