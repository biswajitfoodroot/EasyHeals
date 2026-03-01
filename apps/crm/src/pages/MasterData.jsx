import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import { Plus, Search, Edit3, Trash2, Building2, Stethoscope, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../lib/utils';

const TABS = [
    { id: 'hospitals', label: 'Hospitals', icon: Building2 },
    { id: 'departments', label: 'Departments', icon: Stethoscope },
    { id: 'doctors', label: 'Doctors', icon: UserRound },
];

export default function MasterData() {
    const [activeTab, setActiveTab] = useState('hospitals');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title">Master Data</h1>
                    <p className="page-subtitle">Manage hospitals, departments, and doctors</p>
                </div>
                <button onClick={() => { setEditItem(null); setShowModal(true); }} className="btn-primary btn-sm">
                    <Plus size={14} /> Add {TABS.find(t => t.id === activeTab)?.label.slice(0, -1)}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(''); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-teal' : 'text-muted hover:text-text'
                            }`}>
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-4 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`} className="form-input pl-10" />
            </div>

            {/* Content */}
            {activeTab === 'hospitals' && <HospitalsList search={search} onEdit={(item) => { setEditItem(item); setShowModal(true); }} />}
            {activeTab === 'departments' && <DepartmentsList search={search} onEdit={(item) => { setEditItem(item); setShowModal(true); }} />}
            {activeTab === 'doctors' && <DoctorsList search={search} onEdit={(item) => { setEditItem(item); setShowModal(true); }} />}

            {/* Add/Edit Modal */}
            {showModal && (
                <MasterFormModal type={activeTab} item={editItem} onClose={() => { setShowModal(false); setEditItem(null); }} />
            )}
        </div>
    );
}

function HospitalsList({ search, onEdit }) {
    const { data: hospitals = [], isLoading } = useQuery({
        queryKey: ['hospitals', search],
        queryFn: () => api.get('/masters/hospitals', { params: { search: search || undefined } }).then(r => r.data),
    });

    const queryClient = useQueryClient();
    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/masters/hospitals/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hospitals'] }); toast.success('Hospital deactivated'); },
    });

    if (isLoading) return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>;

    return (
        <div className="space-y-2">
            {hospitals.map(h => (
                <div key={h.id} className="card p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Building2 size={18} /></div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold">{h.name}</div>
                        <div className="text-xs text-muted">{[h.city, h.state, h.country].filter(Boolean).join(', ') || 'No location'}</div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => onEdit(h)} className="btn-icon"><Edit3 size={14} className="text-muted" /></button>
                        <button onClick={() => { if (confirm('Deactivate this hospital?')) deleteMutation.mutate(h.id); }} className="btn-icon"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                </div>
            ))}
            {hospitals.length === 0 && <div className="text-center py-8 text-muted">No hospitals found</div>}
        </div>
    );
}

function DepartmentsList({ search, onEdit }) {
    const { data: departments = [], isLoading } = useQuery({
        queryKey: ['departments', search],
        queryFn: () => api.get('/masters/departments', { params: { search: search || undefined } }).then(r => r.data),
    });

    const queryClient = useQueryClient();
    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/masters/departments/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department deactivated'); },
    });

    if (isLoading) return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map(d => (
                <div key={d.id} className="card p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center"><Stethoscope size={16} /></div>
                        <div className="flex gap-1">
                            <button onClick={() => onEdit(d)} className="btn-icon"><Edit3 size={12} className="text-muted" /></button>
                            <button onClick={() => { if (confirm('Deactivate?')) deleteMutation.mutate(d.id); }} className="btn-icon"><Trash2 size={12} className="text-red-400" /></button>
                        </div>
                    </div>
                    <div className="font-semibold text-sm">{d.name}</div>
                    {d.description && <div className="text-xs text-muted mt-1">{d.description}</div>}
                </div>
            ))}
            {departments.length === 0 && <div className="col-span-full text-center py-8 text-muted">No departments found</div>}
        </div>
    );
}

function DoctorsList({ search, onEdit }) {
    const { data: doctors = [], isLoading } = useQuery({
        queryKey: ['doctors', search],
        queryFn: () => api.get('/masters/doctors', { params: { search: search || undefined } }).then(r => r.data),
    });

    const queryClient = useQueryClient();
    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/masters/doctors/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['doctors'] }); toast.success('Doctor deactivated'); },
    });

    if (isLoading) return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>;

    return (
        <div className="space-y-2">
            {doctors.map(d => (
                <div key={d.id} className="card p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><UserRound size={18} /></div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold">{d.name}</div>
                        <div className="text-xs text-muted">{d.specialization || 'General'} • {d.qualification || ''}</div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => onEdit(d)} className="btn-icon"><Edit3 size={14} className="text-muted" /></button>
                        <button onClick={() => { if (confirm('Deactivate?')) deleteMutation.mutate(d.id); }} className="btn-icon"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                </div>
            ))}
            {doctors.length === 0 && <div className="text-center py-8 text-muted">No doctors found</div>}
        </div>
    );
}

function MasterFormModal({ type, item, onClose }) {
    const queryClient = useQueryClient();
    const isEdit = !!item;
    const [form, setForm] = useState(item || {});

    const mutation = useMutation({
        mutationFn: (data) => isEdit
            ? api.patch(`/masters/${type}/${item.id}`, data)
            : api.post(`/masters/${type}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [type] });
            toast.success(isEdit ? 'Updated' : 'Created');
            onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Failed')),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(form);
    };

    const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

    return (
        <Modal isOpen={true} onClose={onClose} title={`${isEdit ? 'Edit' : 'Add'} ${type.slice(0, -1)}`} size="md"
            footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={mutation.isPending} className="btn-primary">{mutation.isPending ? 'Saving...' : 'Save'}</button></>}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="form-label">Name *</label><input value={form.name || ''} onChange={(e) => update('name', e.target.value)} className="form-input" required /></div>
                {type === 'hospitals' && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="form-label">City</label><input value={form.city || ''} onChange={(e) => update('city', e.target.value)} className="form-input" /></div>
                            <div><label className="form-label">State</label><input value={form.state || ''} onChange={(e) => update('state', e.target.value)} className="form-input" /></div>
                        </div>
                        <div><label className="form-label">Contact Person</label><input value={form.contactPerson || ''} onChange={(e) => update('contactPerson', e.target.value)} className="form-input" /></div>
                        <div><label className="form-label">Contact Phone</label><input value={form.contactPhone || ''} onChange={(e) => update('contactPhone', e.target.value)} className="form-input" /></div>
                    </>
                )}
                {type === 'departments' && (
                    <div><label className="form-label">Description</label><textarea rows={3} value={form.description || ''} onChange={(e) => update('description', e.target.value)} className="form-textarea" /></div>
                )}
                {type === 'doctors' && (
                    <>
                        <div><label className="form-label">Specialization</label><input value={form.specialization || ''} onChange={(e) => update('specialization', e.target.value)} className="form-input" /></div>
                        <div><label className="form-label">Qualification</label><input value={form.qualification || ''} onChange={(e) => update('qualification', e.target.value)} className="form-input" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="form-label">Experience (Years)</label><input type="number" value={form.experienceYears || ''} onChange={(e) => update('experienceYears', parseInt(e.target.value) || '')} className="form-input" /></div>
                            <div><label className="form-label">Contact Phone</label><input value={form.contactPhone || ''} onChange={(e) => update('contactPhone', e.target.value)} className="form-input" /></div>
                        </div>
                    </>
                )}
            </form>
        </Modal>
    );
}
