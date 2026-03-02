import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { LEAD_STATUSES, COUNTRY_CODES, CURRENCIES, GENDERS, LANGUAGES, LEAD_SOURCES } from '../../lib/constants';
import SearchableSelect from '../ui/SearchableSelect';
import Modal from '../ui/Modal';
import { Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../lib/utils';

export default function LeadForm({ isOpen, onClose, editLead = null }) {
    const queryClient = useQueryClient();
    const isEdit = !!editLead;

    const [form, setForm] = useState(editLead || {
        name: '', email: '', phone: '', countryCode: '+91',
        altPhone: '', altCountryCode: '+91', country: '', city: '',
        gender: '', dateOfBirth: '', passportNumber: '',
        medicalIssue: '', treatmentDepartmentId: null, hospitalId: null, doctorId: null,
        approximateAmount: '', currency: 'INR',
        estimatedTravelDate: '', numberOfAttendants: '',
        preferredLanguage: '', insuranceDetails: '', referringDoctor: '',
        medicalHistoryNotes: '', agentId: null, assignedTo: null,
        status: 'new', source: 'manual', notes: '', preferredCallTime: '',
    });

    const [expandedSections, setExpandedSections] = useState({
        contact: true, medical: true, assignment: true, extra: false,
    });

    // Fetch dropdown data
    const { data: hospitalsList } = useQuery({ queryKey: ['hospitals'], queryFn: () => api.get('/masters/hospitals').then(r => r.data) });
    const { data: departmentsList } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/masters/departments').then(r => r.data) });
    const { data: doctorsList } = useQuery({
        queryKey: ['doctors', form.hospitalId, form.treatmentDepartmentId],
        queryFn: () => {
            const params = {};
            if (form.hospitalId) params.hospitalId = form.hospitalId;
            if (form.treatmentDepartmentId) params.departmentId = form.treatmentDepartmentId;
            return api.get('/masters/doctors', { params }).then(r => r.data);
        }
    });
    const { data: agentsData } = useQuery({ queryKey: ['agents'], queryFn: () => api.get('/agents').then(r => r.data) });
    const { data: usersList } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data).catch(() => []) });

    // Inline-add mutations
    const addHospital = useMutation({
        mutationFn: (name) => api.post('/masters/hospitals', { name }),
        onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['hospitals'] }); setForm(f => ({ ...f, hospitalId: res.data.id })); toast.success('Hospital added'); },
    });
    const addDepartment = useMutation({
        mutationFn: (name) => api.post('/masters/departments', { name }),
        onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['departments'] }); setForm(f => ({ ...f, treatmentDepartmentId: res.data.id })); toast.success('Department added'); },
    });
    const addDoctor = useMutation({
        mutationFn: (name) => api.post('/masters/doctors', { name, hospitalId: form.hospitalId, departmentId: form.treatmentDepartmentId }),
        onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['doctors'] }); setForm(f => ({ ...f, doctorId: res.data.id })); toast.success('Doctor added'); },
    });

    // Inline add handlers with prompt
    const handleAddHospital = () => { const name = prompt('Enter hospital name:'); if (name) addHospital.mutate(name); };
    const handleAddDepartment = () => { const name = prompt('Enter department name:'); if (name) addDepartment.mutate(name); };
    const handleAddDoctor = () => { const name = prompt('Enter doctor name:'); if (name) addDoctor.mutate(name); };

    // Save mutation
    const saveLead = useMutation({
        mutationFn: (data) => isEdit
            ? api.patch(`/leads/${editLead.id}`, data)
            : api.post('/leads', data),
        onSuccess: () => {
            toast.success(isEdit ? 'Lead updated' : 'Lead created');
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            onClose();
        },
        onError: (err) => {
            console.error('FULL ERROR RESPONSE:', err?.response?.data || err);
            toast.error(getErrorMessage(err, 'Failed to save'));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name || !form.phone) {
            toast.error('Name and phone are required');
            return;
        }
        const payload = { ...form };

        // Clean up empty strings for numeric/enum fields to avoid Zod errors if backend is strict
        if (payload.numberOfAttendants === '') delete payload.numberOfAttendants;
        else if (payload.numberOfAttendants) payload.numberOfAttendants = Number(payload.numberOfAttendants);

        if (payload.gender === '') delete payload.gender;
        if (payload.approximateAmount === '') delete payload.approximateAmount;

        saveLead.mutate(payload);
    };

    const update = (field, value) => setForm(f => ({ ...f, [field]: value }));
    const toggleSection = (key) => setExpandedSections(s => ({ ...s, [key]: !s[key] }));

    const SectionHeader = ({ id, title, icon }) => (
        <button type="button" onClick={() => toggleSection(id)}
            className="w-full flex items-center justify-between py-3 text-sm font-bold text-text border-b border-border">
            <span className="flex items-center gap-2">{icon} {title}</span>
            {expandedSections[id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
    );

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Lead' : 'New Lead'}
            size="2xl"
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleSubmit} disabled={saveLead.isPending} className="btn-primary flex-1">
                        <Save size={16} /> {saveLead.isPending ? 'Saving...' : isEdit ? 'Update Lead' : 'Create Lead'}
                    </button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Contact Section */}
                <SectionHeader id="contact" title="Contact Information" icon="👤" />
                {expandedSections.contact && (
                    <div className="space-y-4 py-4 px-1 border-x border-gray-50/50">
                        <div>
                            <label className="form-label">Full Name *</label>
                            <input value={form.name} onChange={(e) => update('name', e.target.value)} className="form-input" placeholder="Patient name" required />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Email</label>
                                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="form-input" placeholder="email@example.com" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <label className="form-label">Code</label>
                                    <select value={form.countryCode} onChange={(e) => update('countryCode', e.target.value)} className="form-select text-xs">
                                        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="form-label">Phone *</label>
                                    <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="form-input" placeholder="Phone number" required />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <label className="form-label">Alt Code</label>
                                    <select value={form.altCountryCode} onChange={(e) => update('altCountryCode', e.target.value)} className="form-select text-xs">
                                        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="form-label">Alt Phone</label>
                                    <input value={form.altPhone} onChange={(e) => update('altPhone', e.target.value)} className="form-input" placeholder="Alternative number" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Country</label>
                                    <input value={form.country} onChange={(e) => update('country', e.target.value)} className="form-input" placeholder="e.g. Bangladesh" />
                                </div>
                                <div>
                                    <label className="form-label">City</label>
                                    <input value={form.city} onChange={(e) => update('city', e.target.value)} className="form-input" placeholder="City" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Gender</label>
                                <select value={form.gender || ''} onChange={(e) => update('gender', e.target.value || null)} className="form-select">
                                    <option value="">Select</option>
                                    {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Date of Birth</label>
                                <input type="date" value={form.dateOfBirth || ''} onChange={(e) => update('dateOfBirth', e.target.value)} className="form-input" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Medical Section */}
                <SectionHeader id="medical" title="Medical Details" icon="🏥" />
                {expandedSections.medical && (
                    <div className="space-y-4 py-4 px-1">
                        <div>
                            <label className="form-label">Medical Issue</label>
                            <textarea rows={3} value={form.medicalIssue || ''} onChange={(e) => update('medicalIssue', e.target.value)} className="form-textarea" placeholder="Describe the medical condition..." />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SearchableSelect label="Treatment Department" options={departmentsList || []} value={form.treatmentDepartmentId} onChange={(v) => update('treatmentDepartmentId', v)} onAddNew={handleAddDepartment} placeholder="Select department" />
                            <SearchableSelect label="Hospital" options={hospitalsList || []} value={form.hospitalId} onChange={(v) => update('hospitalId', v)} onAddNew={handleAddHospital} placeholder="Select hospital" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SearchableSelect label="Doctor" options={doctorsList || []} value={form.doctorId} onChange={(v) => update('doctorId', v)} onAddNew={handleAddDoctor} placeholder="Select doctor" />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="form-label">Approx Amount</label>
                                    <input type="number" value={form.approximateAmount || ''} onChange={(e) => update('approximateAmount', e.target.value)} className="form-input" placeholder="e.g. 5000" />
                                </div>
                                <div>
                                    <label className="form-label">Currency</label>
                                    <select value={form.currency} onChange={(e) => update('currency', e.target.value)} className="form-select">
                                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Assignment Section */}
                <SectionHeader id="assignment" title="Assignment & Status" icon="📋" />
                {expandedSections.assignment && (
                    <div className="space-y-4 py-4 px-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SearchableSelect label="Agent / Referrer" options={agentsData?.data || []} value={form.agentId} onChange={(v) => update('agentId', v)} placeholder="Select agent" />
                            <SearchableSelect label="Assigned To (CRM User)" options={usersList || []} value={form.assignedTo} onChange={(v) => update('assignedTo', v)} placeholder="Select user" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Status</label>
                                <select value={form.status} onChange={(e) => update('status', e.target.value)} className="form-select">
                                    {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Source</label>
                                <select value={form.source} onChange={(e) => update('source', e.target.value)} className="form-select">
                                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Extra Details */}
                <SectionHeader id="extra" title="Additional Details" icon="📎" />
                {expandedSections.extra && (
                    <div className="space-y-4 py-4 px-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-1">
                                <label className="form-label">Passport Number</label>
                                <input value={form.passportNumber || ''} onChange={(e) => update('passportNumber', e.target.value)} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label">Est. Travel Date</label>
                                <input type="date" value={form.estimatedTravelDate || ''} onChange={(e) => update('estimatedTravelDate', e.target.value)} className="form-input" />
                            </div>
                            <div>
                                <label className="form-label"># Attendants</label>
                                <input type="number" value={form.numberOfAttendants || ''} onChange={(e) => update('numberOfAttendants', e.target.value)} className="form-input" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Preferred Language</label>
                                <select value={form.preferredLanguage || ''} onChange={(e) => update('preferredLanguage', e.target.value)} className="form-select">
                                    <option value="">Select</option>
                                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Referring Doctor</label>
                                <input value={form.referringDoctor || ''} onChange={(e) => update('referringDoctor', e.target.value)} className="form-input" />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Insurance Details</label>
                            <textarea rows={2} value={form.insuranceDetails || ''} onChange={(e) => update('insuranceDetails', e.target.value)} className="form-textarea" />
                        </div>
                        <div>
                            <label className="form-label">Notes</label>
                            <textarea rows={3} value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} className="form-textarea" placeholder="Any additional notes..." />
                        </div>
                    </div>
                )}
            </form>
        </Modal>
    );
}
