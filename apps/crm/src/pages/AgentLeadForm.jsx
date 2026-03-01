import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { COUNTRY_CODES, GENDERS, RELATIONSHIPS } from '../lib/constants';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Plus, Trash2, Upload, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export default function AgentLeadForm() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '', dateOfBirth: '', passportNumber: '', nativeAddress: '',
        phone: '', countryCode: '+880', email: '', country: '', city: '', gender: '',
        medicalIssue: '', hospitalId: null, treatmentDepartmentId: null, doctorId: null,
        highCommissionName: '', embassyName: '', indiaAddress: '',
        indianPhoneNumber: '', tentativeDuration: '', appointmentDate: '', notes: '',
    });

    const [attendantsList, setAttendantsList] = useState([]);
    const [files, setFiles] = useState([]); // { file, docType }
    const [expandedSections, setExpandedSections] = useState({
        patient: true, attendants: true, medical: true, travel: true, documents: true,
    });

    // Master data
    const { data: hospitalsList } = useQuery({
        queryKey: ['agent-hospitals'],
        queryFn: () => api.get('/agent-portal/masters/hospitals').then(r => r.data),
    });
    const { data: departmentsList } = useQuery({
        queryKey: ['agent-departments'],
        queryFn: () => api.get('/agent-portal/masters/departments').then(r => r.data),
    });
    const { data: doctorsList } = useQuery({
        queryKey: ['agent-doctors', form.hospitalId, form.treatmentDepartmentId],
        queryFn: () => {
            const params = {};
            if (form.hospitalId) params.hospitalId = form.hospitalId;
            if (form.treatmentDepartmentId) params.departmentId = form.treatmentDepartmentId;
            return api.get('/agent-portal/masters/doctors', { params }).then(r => r.data);
        },
    });

    const update = (field, value) => setForm(f => ({ ...f, [field]: value }));
    const toggleSection = (key) => setExpandedSections(s => ({ ...s, [key]: !s[key] }));

    // Attendant management
    const addAttendant = () => {
        setAttendantsList(prev => [...prev, { name: '', dateOfBirth: '', passportNumber: '', relationship: '' }]);
    };
    const updateAttendant = (idx, field, value) => {
        setAttendantsList(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
    };
    const removeAttendant = (idx) => {
        setAttendantsList(prev => prev.filter((_, i) => i !== idx));
    };

    // File management
    const addFile = (file, docType) => {
        if (file.size > 4 * 1024 * 1024) {
            toast.error('File exceeds 4 MB limit. Please compress or resize the file and try again.');
            return;
        }
        setFiles(prev => [...prev, { file, docType }]);
    };
    const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

    // Submit
    const saveLead = useMutation({
        mutationFn: async () => {
            // 1. Create lead with attendants
            const leadRes = await api.post('/agent-portal/leads', {
                ...form,
                attendants: attendantsList.filter(a => a.name),
            });
            const leadId = leadRes.data.id;

            // 2. Upload files
            for (const { file, docType } of files) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('docType', docType);
                await api.post(`/agent-portal/leads/${leadId}/documents`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            return leadRes.data;
        },
        onSuccess: () => {
            toast.success('Lead submitted successfully!');
            navigate('/agent/dashboard');
        },
        onError: (err) => {
            const msg = err.response?.data?.error || err.response?.data?.details?.fieldErrors
                ? 'Please check all required fields'
                : 'Failed to submit lead';
            toast.error(msg);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name || !form.phone) {
            toast.error('Patient name and phone are required');
            return;
        }
        saveLead.mutate();
    };

    const SectionHeader = ({ id, title, icon, count }) => (
        <button type="button" onClick={() => toggleSection(id)}
            className="w-full flex items-center justify-between py-3 text-sm font-bold text-slate-700 border-b border-gray-200">
            <span className="flex items-center gap-2">
                {icon} {title}
                {count > 0 && <span className="bg-teal/10 text-teal text-xs px-2 py-0.5 rounded-full">{count}</span>}
            </span>
            {expandedSections[id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => navigate('/agent/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">New Patient Referral</h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-6 space-y-2">

                {/* ── Patient Info ── */}
                <SectionHeader id="patient" title="Patient Information" icon="👤" />
                {expandedSections.patient && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Patient Name *</label>
                                <input value={form.name} onChange={(e) => update('name', e.target.value)}
                                    className="form-input" placeholder="Full name as on passport" required />
                            </div>
                            <div>
                                <label className="form-label">Date of Birth</label>
                                <input type="date" value={form.dateOfBirth || ''} onChange={(e) => update('dateOfBirth', e.target.value)}
                                    className="form-input" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Passport Number</label>
                                <input value={form.passportNumber || ''} onChange={(e) => update('passportNumber', e.target.value)}
                                    className="form-input" placeholder="e.g. A06005747" />
                            </div>
                            <div>
                                <label className="form-label">Gender</label>
                                <select value={form.gender || ''} onChange={(e) => update('gender', e.target.value || null)} className="form-select">
                                    <option value="">Select</option>
                                    {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Address in Native Country</label>
                            <textarea rows={2} value={form.nativeAddress || ''} onChange={(e) => update('nativeAddress', e.target.value)}
                                className="form-textarea" placeholder="Full address..." />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="form-label">Code</label>
                                <select value={form.countryCode} onChange={(e) => update('countryCode', e.target.value)} className="form-select">
                                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="form-label">Phone *</label>
                                <input value={form.phone} onChange={(e) => update('phone', e.target.value)}
                                    className="form-input" placeholder="Phone number" required />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Email</label>
                            <input type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)}
                                className="form-input" placeholder="email@example.com" />
                        </div>
                    </div>
                )}

                {/* ── Attendants ── */}
                <SectionHeader id="attendants" title="Attendants" icon="👥" count={attendantsList.length} />
                {expandedSections.attendants && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        {attendantsList.map((att, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50 relative">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Attendant {idx + 1}</span>
                                    <button type="button" onClick={() => removeAttendant(idx)}
                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="form-label">Name *</label>
                                        <input value={att.name} onChange={(e) => updateAttendant(idx, 'name', e.target.value)}
                                            className="form-input" placeholder="Full name" />
                                    </div>
                                    <div>
                                        <label className="form-label">Date of Birth</label>
                                        <input type="date" value={att.dateOfBirth || ''} onChange={(e) => updateAttendant(idx, 'dateOfBirth', e.target.value)}
                                            className="form-input" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="form-label">Passport Number</label>
                                        <input value={att.passportNumber || ''} onChange={(e) => updateAttendant(idx, 'passportNumber', e.target.value)}
                                            className="form-input" placeholder="Passport No." />
                                    </div>
                                    <div>
                                        <label className="form-label">Relationship</label>
                                        <select value={att.relationship || ''} onChange={(e) => updateAttendant(idx, 'relationship', e.target.value)}
                                            className="form-select">
                                            <option value="">Select</option>
                                            {RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addAttendant}
                            className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-slate-500 hover:text-teal hover:border-teal/40 transition-colors flex items-center justify-center gap-2">
                            <Plus size={16} /> Add Attendant
                        </button>
                    </div>
                )}

                {/* ── Medical Details ── */}
                <SectionHeader id="medical" title="Medical & Hospital" icon="🏥" />
                {expandedSections.medical && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <div>
                            <label className="form-label">Medical Issue</label>
                            <textarea rows={3} value={form.medicalIssue || ''} onChange={(e) => update('medicalIssue', e.target.value)}
                                className="form-textarea" placeholder="Describe the medical condition..." />
                        </div>
                        <div>
                            <label className="form-label">Hospital</label>
                            <select value={form.hospitalId || ''} onChange={(e) => update('hospitalId', e.target.value || null)} className="form-select">
                                <option value="">Select hospital</option>
                                {(hospitalsList || []).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Department</label>
                            <select value={form.treatmentDepartmentId || ''} onChange={(e) => update('treatmentDepartmentId', e.target.value || null)} className="form-select">
                                <option value="">Select department</option>
                                {(departmentsList || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Doctor</label>
                            <select value={form.doctorId || ''} onChange={(e) => update('doctorId', e.target.value || null)} className="form-select">
                                <option value="">Select doctor</option>
                                {(doctorsList || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* ── Travel / Embassy ── */}
                <SectionHeader id="travel" title="Travel & Embassy Details" icon="✈️" />
                {expandedSections.travel && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <div>
                            <label className="form-label">High Commission Name</label>
                            <input value={form.highCommissionName || ''} onChange={(e) => update('highCommissionName', e.target.value)}
                                className="form-input" placeholder="e.g. HIGH COMMISSION OF INDIA (DHAKA)" />
                        </div>
                        <div>
                            <label className="form-label">Embassy / VFS Location</label>
                            <input value={form.embassyName || ''} onChange={(e) => update('embassyName', e.target.value)}
                                className="form-input" placeholder="e.g. Jamuna Future Park (JFP)" />
                        </div>
                        <div>
                            <label className="form-label">Address in India (Hotel)</label>
                            <textarea rows={2} value={form.indiaAddress || ''} onChange={(e) => update('indiaAddress', e.target.value)}
                                className="form-textarea" placeholder="Hotel / accommodation address in India" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Indian Phone Number</label>
                                <input value={form.indianPhoneNumber || ''} onChange={(e) => update('indianPhoneNumber', e.target.value)}
                                    className="form-input" placeholder="+91 XXXXXXXXXX" />
                            </div>
                            <div>
                                <label className="form-label">Tentative Duration of Stay</label>
                                <input value={form.tentativeDuration || ''} onChange={(e) => update('tentativeDuration', e.target.value)}
                                    className="form-input" placeholder="e.g. 20 Days" />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Appointment Date</label>
                            <input type="date" value={form.appointmentDate || ''} onChange={(e) => update('appointmentDate', e.target.value)}
                                className="form-input" />
                        </div>
                        <div>
                            <label className="form-label">Notes</label>
                            <textarea rows={2} value={form.notes || ''} onChange={(e) => update('notes', e.target.value)}
                                className="form-textarea" placeholder="Any additional notes..." />
                        </div>
                    </div>
                )}

                {/* ── Documents ── */}
                <SectionHeader id="documents" title="Documents" icon="📎" count={files.length} />
                {expandedSections.documents && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <p className="text-xs text-slate-500">Upload passport copies & latest prescriptions. Max 4 MB per file.</p>

                        {files.map((f, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border">
                                <FileText size={16} className="text-slate-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{f.file.name}</div>
                                    <div className="text-xs text-slate-400">{f.docType.replace('_', ' ')} • {(f.file.size / 1024 / 1024).toFixed(2)} MB</div>
                                </div>
                                <button type="button" onClick={() => removeFile(idx)} className="p-1 text-red-400 hover:text-red-600">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-teal/40 transition-colors">
                                <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                                <div className="text-sm font-medium text-slate-600">Passport Copy</div>
                                <div className="text-xs text-slate-400">PDF, JPEG, PNG</div>
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    onChange={(e) => e.target.files[0] && addFile(e.target.files[0], 'passport')} />
                            </label>
                            <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-teal/40 transition-colors">
                                <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                                <div className="text-sm font-medium text-slate-600">Prescription</div>
                                <div className="text-xs text-slate-400">PDF, JPEG, PNG</div>
                                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    onChange={(e) => e.target.files[0] && addFile(e.target.files[0], 'prescription')} />
                            </label>
                        </div>
                    </div>
                )}

                {/* Submit */}
                <div className="pt-4 pb-8">
                    <button
                        type="submit"
                        disabled={saveLead.isPending}
                        className="w-full py-3.5 bg-teal text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-teal-600 transition-colors disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saveLead.isPending ? 'Submitting...' : 'Submit Lead'}
                    </button>
                </div>
            </form>
        </div>
    );
}
