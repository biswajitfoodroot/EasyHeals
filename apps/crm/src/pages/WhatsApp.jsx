import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import { WA_CATEGORIES } from '../lib/constants';
import { timeAgo, getErrorMessage } from '../lib/utils';
import { Plus, MessageSquare, Edit3, Trash2, Copy, Search, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhatsApp() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editTemplate, setEditTemplate] = useState(null);
    const [category, setCategory] = useState('');
    const [showTestModal, setShowTestModal] = useState(null);

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['wa-templates', category],
        queryFn: () => api.get('/whatsapp/templates', { params: { category: category || undefined } }).then(r => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/whatsapp/templates/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wa-templates'] }); toast.success('Template deactivated'); },
    });

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title">WhatsApp Templates</h1>
                    <p className="page-subtitle">Create and manage message templates</p>
                </div>
                <button onClick={() => { setEditTemplate(null); setShowModal(true); }} className="btn-primary btn-sm">
                    <Plus size={14} /> New Template
                </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button onClick={() => setCategory('')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${!category ? 'bg-teal text-white' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}>All</button>
                {WA_CATEGORIES.map(cat => (
                    <button key={cat.value} onClick={() => setCategory(cat.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${category === cat.value ? 'bg-teal text-white' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}>
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-48 w-full rounded-2xl" />)
                ) : templates.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted">
                        <MessageSquare size={48} className="mx-auto mb-4" />
                        <p className="font-medium">No templates yet</p>
                        <p className="text-xs mt-1">Create your first WhatsApp template</p>
                    </div>
                ) : (
                    templates.map(template => (
                        <div key={template.id} className="card p-5 flex flex-col hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="font-bold">{template.name}</div>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 uppercase">{template.category}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditTemplate(template); setShowModal(true); }} className="btn-icon"><Edit3 size={12} className="text-muted" /></button>
                                    <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(template.id); }} className="btn-icon"><Trash2 size={12} className="text-red-400" /></button>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-gray-700 flex-1 mb-3 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                {template.bodyText}
                            </div>

                            {template.variables && template.variables.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {template.variables.map(v => (
                                        <span key={v} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-mono">{`{{${v}}}`}</span>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted">{timeAgo(template.createdAt)}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => copyToClipboard(template.bodyText)} className="text-xs font-bold text-muted hover:text-teal transition-colors flex items-center gap-1"><Copy size={12} /> Copy</button>
                                    <button onClick={() => setShowTestModal(template)} className="text-xs font-bold text-teal hover:underline flex items-center gap-1"><Send size={12} /> Test</button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && <TemplateFormModal template={editTemplate} onClose={() => { setShowModal(false); setEditTemplate(null); }} />}

            {showTestModal && <TestTemplateModal template={showTestModal} onClose={() => setShowTestModal(null)} />}
        </div>
    );
}

function TemplateFormModal({ template, onClose }) {
    const queryClient = useQueryClient();
    const isEdit = !!template;
    const [form, setForm] = useState(template || { name: '', category: 'custom', bodyText: '' });

    const mutation = useMutation({
        mutationFn: (data) => isEdit ? api.patch(`/whatsapp/templates/${template.id}`, data) : api.post('/whatsapp/templates', data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['wa-templates'] }); toast.success(isEdit ? 'Updated' : 'Created'); onClose(); },
        onError: (err) => toast.error(getErrorMessage(err, 'Failed')),
    });

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <Modal isOpen={true} onClose={onClose} title={`${isEdit ? 'Edit' : 'New'} Template`} size="lg"
            footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Saving...' : 'Save'}</button></>}>
            <div className="space-y-4">
                <div><label className="form-label">Template Name *</label><input value={form.name} onChange={(e) => update('name', e.target.value)} className="form-input" placeholder="e.g. Welcome Greeting" required /></div>
                <div><label className="form-label">Category</label>
                    <select value={form.category} onChange={(e) => update('category', e.target.value)} className="form-select">
                        {WA_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">Message Body *</label>
                    <textarea rows={6} value={form.bodyText} onChange={(e) => update('bodyText', e.target.value)} className="form-textarea font-mono text-sm"
                        placeholder="Hello {{name}}, thank you for reaching out to EasyHeals. We specialize in {{department}} treatments..." />
                    <p className="text-xs text-muted mt-1">Use {'{{variable}}'} for dynamic placeholders.</p>
                </div>
            </div>
        </Modal>
    );
}

function TestTemplateModal({ template, onClose }) {
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+91');
    const [variables, setVariables] = useState({});

    const vars = template.variables || [];

    const handleSend = async () => {
        try {
            const res = await api.post('/whatsapp/generate-link', {
                phone, countryCode, templateId: template.id, variables,
            });
            window.open(res.data.url, '_blank');
            onClose();
        } catch (err) {
            toast.error('Failed to generate link');
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Test Template" size="md"
            footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSend} disabled={!phone} className="btn-primary"><MessageSquare size={14} /> Open WhatsApp</button></>}>
            <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                    <div><label className="form-label">Code</label><input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="form-input" /></div>
                    <div className="col-span-3"><label className="form-label">Phone *</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" placeholder="Phone number" required /></div>
                </div>
                {vars.map(v => (
                    <div key={v}>
                        <label className="form-label">{v}</label>
                        <input value={variables[v] || ''} onChange={(e) => setVariables(prev => ({ ...prev, [v]: e.target.value }))} className="form-input" placeholder={`Value for {{${v}}}`} />
                    </div>
                ))}
            </div>
        </Modal>
    );
}
