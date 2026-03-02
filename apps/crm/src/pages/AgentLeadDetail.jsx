import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { API_BASE } from '../lib/api';
import { getStatusConfig, getVerificationConfig } from '../lib/constants';
import { ArrowLeft, Download, Printer, FileText, Users, Plane, Building2, Clock, CheckCircle, XCircle, Lock, Edit3, Save, Shield, Scan, Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AgentLeadDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const printRef = useRef();

    const { data: lead, isLoading } = useQuery({
        queryKey: ['agent-lead', id],
        queryFn: () => api.get(`/agent-portal/leads/${id}`).then(r => r.data),
    });

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Lead - ${lead?.name} (${lead?.refId})</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #333; font-size: 13px; }
                    h1 { font-size: 18px; border-bottom: 2px solid #0d9488; padding-bottom: 8px; }
                    h2 { font-size: 14px; color: #0d9488; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                    .field { margin-bottom: 6px; }
                    .label { font-weight: bold; color: #666; font-size: 11px; text-transform: uppercase; }
                    .value { margin-top: 2px; }
                    .attendant { border: 1px solid #ddd; padding: 8px; margin: 4px 0; border-radius: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 12px; }
                    th { background: #f5f5f5; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-slate-400">Loading...</div></div>;
    if (!lead) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-slate-400">Lead not found</div></div>;

    const statusConf = getStatusConfig(lead.status);
    const verConf = getVerificationConfig(lead.verificationStatus);
    const regularDocs = (lead.documents || []).filter(d => d.docType !== 'visa_invite_letter');
    const visaLetters = lead.visaLetters || [];

    const Field = ({ label, value }) => value ? (
        <div className="field">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="text-sm text-slate-800 mt-0.5">{value}</div>
        </div>
    ) : null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/agent/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">{lead.name}</h1>
                            <p className="text-xs text-slate-500 font-mono">{lead.refId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${verConf.bgClass}`}>
                            {verConf.label}
                        </span>
                        <button onClick={handlePrint}
                            className="p-2 hover:bg-gray-100 rounded-lg text-slate-500" title="Print / Share">
                            <Printer size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Rejection reason banner */}
            {lead.verificationStatus === 'rejected' && lead.rejectionReason && (
                <div className="max-w-3xl mx-auto px-4 pt-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-sm font-semibold text-red-700">Lead Rejected</div>
                            <div className="text-sm text-red-600 mt-1">{lead.rejectionReason}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Printable Content */}
            <div ref={printRef} className="max-w-3xl mx-auto px-4 py-6 space-y-4">

                {/* Patient Info */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-bold text-teal flex items-center gap-2 mb-4">
                        <Users size={16} /> Patient Information
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Field label="Patient Name" value={lead.name} />
                        <Field label="Date of Birth" value={lead.dateOfBirth} />
                        <Field label="Passport No." value={lead.passportNumber} />
                        <Field label="Phone" value={`${lead.countryCode || ''} ${lead.phone}`} />
                        <Field label="Email" value={lead.email} />
                        <Field label="Gender" value={lead.gender} />
                        <Field label="Country" value={lead.country} />
                        <Field label="City" value={lead.city} />
                    </div>
                    {lead.nativeAddress && (
                        <div className="mt-3">
                            <Field label="Native Address" value={lead.nativeAddress} />
                        </div>
                    )}
                </div>

                {/* Attendants */}
                {lead.attendants?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="text-sm font-bold text-teal flex items-center gap-2 mb-4">
                            <Users size={16} /> Attendants ({lead.attendants.length})
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600">#</th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Name</th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600">DOB</th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Passport</th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Relationship</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lead.attendants.map((att, i) => (
                                        <tr key={att.id}>
                                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                                            <td className="px-3 py-2 font-medium">{att.name}</td>
                                            <td className="px-3 py-2">{att.dateOfBirth || '-'}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{att.passportNumber || '-'}</td>
                                            <td className="px-3 py-2 capitalize">{att.relationship || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Medical & Hospital */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-bold text-teal flex items-center gap-2 mb-4">
                        <Building2 size={16} /> Medical & Hospital
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Hospital" value={lead.hospitalName} />
                        <Field label="Department" value={lead.departmentName} />
                        <Field label="Doctor" value={lead.doctorName} />
                        <Field label="Status" value={statusConf.label} />
                    </div>
                    {lead.medicalIssue && (
                        <div className="mt-3">
                            <Field label="Medical Issue" value={lead.medicalIssue} />
                        </div>
                    )}
                </div>

                {/* Travel / Embassy */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-bold text-teal flex items-center gap-2 mb-4">
                        <Plane size={16} /> Travel & Embassy
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="High Commission" value={lead.highCommissionName} />
                        <Field label="Embassy / VFS" value={lead.embassyName} />
                        <Field label="India Address (Hotel)" value={lead.indiaAddress} />
                        <Field label="Indian Phone" value={lead.indianPhoneNumber} />
                        <Field label="Duration of Stay" value={lead.tentativeDuration} />
                        <Field label="Appointment Date" value={lead.appointmentDate} />
                    </div>
                </div>

                {/* Notes */}
                {lead.notes && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="text-sm font-bold text-teal mb-3">📝 Notes</h2>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                )}
            </div>

            {/* Visa Letter Data Section */}
            <div className="max-w-3xl mx-auto px-4 pb-2">
                <AgentVisaSection lead={lead} />
            </div>

            {/* Documents (not in printable section) */}
            <div className="max-w-3xl mx-auto px-4 pb-6 space-y-4">
                {regularDocs.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="text-sm font-bold text-teal flex items-center gap-2 mb-4">
                            <FileText size={16} /> Documents ({regularDocs.length})
                        </h2>
                        <div className="space-y-2">
                            {regularDocs.map(doc => (
                                <div key={doc.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border">
                                    <FileText size={16} className="text-slate-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{doc.fileName}</div>
                                        <div className="text-xs text-slate-400 capitalize">{doc.docType?.replace('_', ' ')}</div>
                                    </div>
                                    <a href={`${API_BASE.replace('/v1', '')}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer"
                                        className="p-1.5 text-teal hover:bg-teal/10 rounded-lg">
                                        <Download size={14} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Visa Invite Letters */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="text-sm font-bold text-teal flex items-center gap-2 mb-4">
                        📋 Visa Invite Letters
                    </h2>
                    {visaLetters.length > 0 ? (
                        <div className="space-y-2">
                            {visaLetters.map(doc => (
                                <div key={doc.id} className="flex items-center gap-3 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                                    <FileText size={16} className="text-green-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{doc.fileName}</div>
                                        <div className="text-xs text-green-600">
                                            Uploaded {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}
                                        </div>
                                    </div>
                                    <a href={`${API_BASE.replace('/v1', '')}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors">
                                        <Download size={12} /> Download
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Clock size={24} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm text-slate-400">Visa invite letters will appear here once uploaded by your EasyHeals advisor.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Agent Visa Letter Section ────────────────────────────────────────────────

const EMPTY_PERSON = { surname: '', givenName: '', passportNo: '', dateOfBirth: '', gender: '', nationality: '', address: '', contactNumber: '', email: '' };
const EMPTY_PATIENT = { ...EMPTY_PERSON, doctorSpeciality: '' };
const EMPTY_ATTENDANT = { ...EMPTY_PERSON, relationship: '' };

function AgentVisaSection({ lead }) {
    const queryClient = useQueryClient();
    const isFrozen = !!lead.visaDataFrozen;

    const existing = lead.visaLetterData || {};

    // Split name for auto-population
    const nameParts = (lead.name || '').split(' ');
    const autoGivenName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : lead.name || '';
    const autoSurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    const autoPatient = {
        ...EMPTY_PATIENT,
        surname: autoSurname,
        givenName: autoGivenName,
        dateOfBirth: lead.dateOfBirth || '',
        gender: lead.gender || '',
        passportNo: lead.passportNumber || '',
        contactNumber: lead.phone || '',
        email: lead.email || '',
        nationality: lead.country || '',
        address: lead.nativeAddress || '',
    };

    const [data, setData] = useState({
        patient: { ...autoPatient, ...(existing.patient || {}) },
        attendant1: { ...EMPTY_ATTENDANT, ...(existing.attendant1 || {}) },
        attendant2: { ...EMPTY_ATTENDANT, ...(existing.attendant2 || {}) },
        attendant3: { ...EMPTY_ATTENDANT, ...(existing.attendant3 || {}) },
    });
    const [editing, setEditing] = useState(false);
    const [scanning, setScanning] = useState(null);

    const handleScan = async (sectionKey, file) => {
        setScanning(sectionKey);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/ocr/scan-passport', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const ocr = res.data;
            setData(prev => ({
                ...prev,
                [sectionKey]: {
                    ...prev[sectionKey],
                    surname: ocr.surname || prev[sectionKey].surname,
                    givenName: ocr.givenName || prev[sectionKey].givenName,
                    passportNo: ocr.passportNo || prev[sectionKey].passportNo,
                    dateOfBirth: ocr.dob || prev[sectionKey].dateOfBirth,
                    gender: ocr.gender || prev[sectionKey].gender,
                    nationality: ocr.nationality || prev[sectionKey].nationality,
                    address: ocr.address || prev[sectionKey].address,
                }
            }));
            toast.success('Document scanned and fields auto-filled');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to scan document');
        } finally {
            setScanning(null);
        }
    };

    const saveMutation = useMutation({
        mutationFn: (visaData) => {
            const fullName = `${visaData.patient.givenName} ${visaData.patient.surname}`.trim();
            const payload = {
                visaLetterData: visaData,
                // Sync patient info
                name: fullName,
                passportNumber: visaData.patient.passportNo,
                dateOfBirth: visaData.patient.dateOfBirth,
                gender: visaData.patient.gender,
                country: visaData.patient.nationality,
                nativeAddress: visaData.patient.address,
                phone: visaData.patient.contactNumber,
                email: visaData.patient.email,
            };
            return api.patch(`/agent-portal/leads/${lead.id}/visa-data`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-lead', lead.id] });
            toast.success('Visa letter information saved and profile updated');
            setEditing(false);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
    });

    const updateField = (section, field, value) => {
        setData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    };

    const GENDERS = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' }
    ];
    const RELATIONSHIPS = [
        { value: 'spouse', label: 'Spouse' },
        { value: 'parent', label: 'Parent' },
        { value: 'child', label: 'Child' },
        { value: 'sibling', label: 'Sibling' },
        { value: 'relative', label: 'Relative' },
        { value: 'friend', label: 'Friend' },
        { value: 'other', label: 'Other' }
    ];

    const PersonCard = ({ title, sectionKey, fields, icon }) => {
        const sectionData = data[sectionKey];
        const total = Object.keys(fields).length;
        const filled = Object.values(sectionData).filter(v => v && String(v).trim()).length;
        const pct = Math.round((filled / total) * 100);

        const fileInputRef = useRef();

        return (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-teal flex items-center gap-2">
                        <span>{icon}</span> {title}
                    </h2>
                    <div className="flex items-center gap-3">
                        {!isFrozen && (
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*,.pdf"
                                    onChange={(e) => e.target.files[0] && handleScan(sectionKey, e.target.files[0])}
                                />
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    disabled={scanning === sectionKey}
                                    className="text-[10px] font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                >
                                    {scanning === sectionKey ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />}
                                    {scanning === sectionKey ? 'Scanning...' : 'Scan Passport'}
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-teal rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">{filled}/{total}</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(fields).map(([key, config]) => (
                        <div key={key} className={config.fullWidth ? 'col-span-2' : ''}>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{config.label}</div>
                            {!editing || isFrozen ? (
                                <div className="text-sm text-slate-800">
                                    {config.type === 'select'
                                        ? config.options.find(o => o.value === sectionData[key])?.label || <span className="text-gray-300 italic">—</span>
                                        : sectionData[key] || <span className="text-gray-300 italic">—</span>}
                                </div>
                            ) : config.type === 'select' ? (
                                <select value={sectionData[key] || ''} onChange={e => updateField(sectionKey, key, e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                                    <option value="">Select...</option>
                                    {config.options.map(o => (
                                        <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
                                            {typeof o === 'string' ? o : o.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={config.type || 'text'}
                                    value={sectionData[key] || ''}
                                    onChange={e => updateField(sectionKey, key, e.target.value)}
                                    className={`w-full border rounded-lg px-3 py-1.5 text-sm ${config.required && !sectionData[key] ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}
                                    required={config.required}
                                    pattern={config.pattern}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const patientFields = {
        surname: { label: 'Patient Surname', required: true },
        givenName: { label: 'Patient Given Name', required: true },
        gender: { label: 'Gender', type: 'select', options: GENDERS, required: true },
        dateOfBirth: { label: 'Date of Birth', type: 'date', required: true },
        nationality: { label: 'Nationality', required: true },
        passportNo: { label: 'Passport No', required: true, pattern: '[A-Z0-9]{6,12}' },
        address: { label: 'Address in Native Country', fullWidth: true, required: true },
        contactNumber: { label: 'Contact Number', required: true },
        email: { label: 'Email id', type: 'email', required: true },
        doctorSpeciality: { label: "Diagnosis/ Proposed Treatment", required: true },
    };

    const attendantFields = {
        surname: { label: 'Attendant Surname' },
        givenName: { label: 'Attendant Given Name' },
        passportNo: { label: 'Attendant Passport No', pattern: '[A-Z0-9]{6,12}' },
        gender: { label: 'Gender', type: 'select', options: GENDERS },
        dateOfBirth: { label: 'Date of Birth', type: 'date' },
        address: { label: 'Address in Native Country', fullWidth: true },
        contactNumber: { label: 'Contact Number' },
        email: { label: 'Email id', type: 'email' },
        relationship: { label: 'Relationship between Patient & Attendant', type: 'select', options: RELATIONSHIPS },
    };

    return (
        <div className="space-y-4">
            {/* Section header */}
            <div className="flex flex-col gap-3 py-2 border-b border-gray-100 mb-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Shield size={12} className="text-teal" /> Visa Letter Management
                    </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isFrozen && (
                        <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                            <Lock size={14} /> Locked by Advisor
                        </div>
                    )}
                    {!isFrozen && (
                        editing ? (
                            <button onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold bg-teal text-white hover:bg-teal-dark transition-all shadow-sm">
                                <Save size={14} /> {saveMutation.isPending ? 'Saving...' : 'Save All Details'}
                            </button>
                        ) : (
                            <button onClick={() => setEditing(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold bg-teal-50 text-teal hover:bg-teal-100 border border-teal-100 transition-all shadow-sm">
                                <Edit3 size={14} /> Edit Information
                            </button>
                        )
                    )}
                </div>
            </div>

            {isFrozen && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                    <Shield size={14} />
                    <span>This information has been <strong>finalized/locked</strong> and cannot be modified. Contact your advisor if changes are needed.</span>
                </div>
            )}

            <PersonCard title="Patient Details" sectionKey="patient" fields={patientFields} icon="🧑‍⚕️" />
            <PersonCard title="Details of Attendant 1" sectionKey="attendant1" fields={attendantFields} icon="👤" />
            <PersonCard title="Details of Attendant 2" sectionKey="attendant2" fields={attendantFields} icon="👤" />
            <PersonCard title="Details of Attendant 3" sectionKey="attendant3" fields={attendantFields} icon="👤" />

            {editing && !isFrozen && (
                <button onClick={() => saveMutation.mutate(data)} disabled={saveMutation.isPending}
                    className="w-full py-3 bg-teal text-white text-sm font-bold rounded-xl hover:bg-teal-dark transition-colors flex items-center justify-center gap-2">
                    <Save size={16} /> {saveMutation.isPending ? 'Saving...' : 'Save All Visa Information'}
                </button>
            )}
        </div>
    );
}

