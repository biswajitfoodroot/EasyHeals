import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import StatusBadge from '../ui/StatusBadge';
import PhoneLink from '../ui/PhoneLink';
import FileUpload, { FileItem } from '../ui/FileUpload';
import { LEAD_STATUSES, DOCUMENT_TYPES, getVerificationConfig } from '../../lib/constants';
import { formatCurrency, formatDate, timeAgo, getWhatsAppUrl } from '../../lib/utils';
import {
    X, Edit3, Archive, MessageCircle, Mail, MapPin,
    Calendar, DollarSign, Building2, Stethoscope, User,
    FileText, Clock, Send, Plus, Briefcase, ChevronDown,
    CheckCircle, XCircle, Upload, Printer, Users, Plane, Download,
    Lock, Unlock, Save, Shield, Scan, Camera, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../../hooks/useAuth';

export default function LeadDetail({ lead, triggerEmail, onClose, onEdit }) {
    const queryClient = useQueryClient();
    const user = useAuth(state => state.user);
    const [noteText, setNoteText] = useState('');
    const [selectedDocType, setSelectedDocType] = useState('other');
    const [activeTab, setActiveTab] = useState('visa');
    const [showWaModal, setShowWaModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedEmails, setSelectedEmails] = useState([]);
    const [customEmail, setCustomEmail] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [selectedAttachmentIds, setSelectedAttachmentIds] = useState([]);
    const [isSending, setIsSending] = useState(false);

    const { data: documents } = useQuery({
        queryKey: ['documents', lead?.id],
        queryFn: () => api.get(`/leads/${lead.id}/documents`).then(r => r.data),
        enabled: !!lead?.id,
    });

    const { data: leadAttendants } = useQuery({
        queryKey: ['attendants', lead?.id],
        queryFn: () => api.get(`/leads/${lead.id}/attendants`).then(r => r.data),
        enabled: !!lead?.id,
    });

    // Status change
    const updateStatus = useMutation({
        mutationFn: (status) => api.patch(`/leads/${lead.id}`, { status }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); queryClient.invalidateQueries({ queryKey: ['lead', lead.id] }); toast.success('Status updated'); },
    });

    // Add note
    const addNote = useMutation({
        mutationFn: (note) => api.post(`/leads/${lead.id}/notes`, { note }),
        onSuccess: () => { setNoteText(''); queryClient.invalidateQueries({ queryKey: ['lead', lead.id] }); toast.success('Note added'); },
    });

    // Upload document
    const uploadDoc = useMutation({
        mutationFn: (file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('docType', selectedDocType);
            return api.post(`/leads/${lead.id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents', lead.id] }); toast.success('Document uploaded'); },
    });

    // Delete document
    const deleteDoc = useMutation({
        mutationFn: (docId) => api.delete(`/documents/${docId}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents', lead.id] }); toast.success('Document deleted'); },
    });

    // Verify lead
    const verifyLead = useMutation({
        mutationFn: ({ action, reason }) => api.post(`/leads/${lead.id}/verify`, { action, reason }),
        onSuccess: (_, { action }) => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
            toast.success(`Lead ${action}ed`);
            setShowRejectForm(false);
            setRejectReason('');
        },
    });

    // Upload visa letter
    const uploadVisa = useMutation({
        mutationFn: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            return api.post(`/leads/${lead.id}/visa-letters`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents', lead.id] }); toast.success('Visa invite letter uploaded'); },
    });

    const sendVisaEmail = useMutation({
        mutationFn: (emailData) => api.post(`/leads/${lead.id}/send-visa-email`, emailData),
        onSuccess: () => {
            toast.success('Visa letter emailed to hospital');
            setShowEmailModal(false);
            queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to send email'),
    });

    const handleEmailToHospital = () => {
        const emails = [];
        if (lead.hospitalEmail) emails.push(lead.hospitalEmail);

        // hospitalEmailIds can be an array or a JSON string depending on DB driver
        let emailIds = lead.hospitalEmailIds;
        if (typeof emailIds === 'string') {
            try { emailIds = JSON.parse(emailIds); } catch { emailIds = []; }
        }
        if (Array.isArray(emailIds)) {
            emails.push(...emailIds.filter(e => e && e.trim()));
        }

        // Pre-fill subject and body if empty
        if (!emailSubject) setEmailSubject(`Request for VIL - ${lead.name}`);
        if (!emailBody) {
            const data = lead.visaLetterData || {};
            const patientName = `${data.patient?.givenName || lead.name} ${data.patient?.surname || ''}`.trim();

            const personBlock = (person, label) => {
                if (!person?.surname) return '';
                const lines = [`--- ${label} ---`];
                if (person.givenName || person.surname) lines.push(`Name: ${[person.givenName, person.surname].filter(Boolean).join(' ')}`);
                if (person.dateOfBirth) lines.push(`Date of Birth: ${person.dateOfBirth}`);
                if (person.gender) lines.push(`Gender: ${person.gender}`);
                if (person.passportNo) lines.push(`Passport No: ${person.passportNo}`);
                if (person.nationality) lines.push(`Nationality: ${person.nationality}`);
                if (person.address) lines.push(`Address: ${person.address}`);
                if (person.contactNumber) lines.push(`Contact Number: ${person.contactNumber}`);
                if (person.email) lines.push(`Email: ${person.email}`);
                if (person.relationship) lines.push(`Relationship: ${person.relationship}`);
                if (person.doctorSpeciality) lines.push(`Doctor Speciality: ${person.doctorSpeciality}`);
                if (person.departmentName) lines.push(`Department: ${person.departmentName}`);
                if (person.appointmentDate) lines.push(`Appointment Date: ${person.appointmentDate}`);
                if (person.doctorMeetName) lines.push(`Doctor to Meet: ${person.doctorMeetName}`);
                return lines.join('\n');
            };

            const blocks = [
                personBlock(data.patient, 'Patient'),
                personBlock(data.attendant1, 'Attendant 1'),
                personBlock(data.attendant2, 'Attendant 2'),
                personBlock(data.attendant3, 'Attendant 3'),
            ].filter(Boolean).join('\n\n');

            setEmailBody(`Dear Sir/Madam,\n\nPlease find attached the Visa Invitation Letter request for our patient, ${patientName}.\n\nBelow are the complete details for your quick reference:\n\n${blocks}`);
        }

        setSelectedEmails(emails); // Default to all
        setSelectedAttachmentIds([]); // Reset on open
        setShowEmailModal(true);
    };

    const uploadAttachment = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', 'other');
        try {
            const res = await api.post(`/leads/${lead.id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            queryClient.invalidateQueries({ queryKey: ['documents', lead.id] });
            setSelectedAttachmentIds(prev => [...prev, res.data.id]);
            toast.success('Document uploaded and attached');
        } catch (err) {
            toast.error('Upload failed');
        }
    };

    useEffect(() => {
        if (triggerEmail) {
            handleEmailToHospital();
        }
    }, [triggerEmail]);

    if (!lead) return null;

    const tabs = [
        { id: 'visa', label: '📋 Visa Info' },
        { id: 'attendants', label: `Attendants (${leadAttendants?.length || 0})` },
        { id: 'documents', label: `Docs (${documents?.length || 0})` },
        { id: 'activity', label: 'Activity' },
    ];

    const verConf = getVerificationConfig(lead.verificationStatus);
    const isAgentSubmitted = lead.source === 'agent_portal';

    const InfoRow = ({ icon: Icon, label, value }) => value ? (
        <div className="flex items-start gap-3 py-2">
            <Icon size={14} className="text-muted mt-0.5 shrink-0" />
            <div>
                <div className="text-[10px] font-bold text-muted uppercase">{label}</div>
                <div className="text-sm font-medium">{value}</div>
            </div>
        </div>
    ) : null;

    return (
        <div className="fixed inset-0 lg:relative lg:inset-auto lg:flex-1 2xl:flex-none 2xl:w-[480px] bg-white lg:border-l border-border flex flex-col shadow-2xl z-40 animate-slide-in-right">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-gray-50 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg lg:hidden"><X size={18} /></button>
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(lead)} className="btn-ghost btn-sm"><Edit3 size={14} /> Edit</button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg hidden lg:block"><X size={18} /></button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal text-white rounded-xl flex items-center justify-center font-bold text-xl uppercase">{lead.name?.[0]}</div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{lead.name}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted font-mono">{lead.refId}</span>
                            <StatusBadge status={lead.status} size="xs" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Verification Banner for agent-submitted leads */}
            {isAgentSubmitted && (
                <div className="px-6 py-3 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${verConf.bgClass}`}>{verConf.label}</span>
                            <span className="text-xs text-muted">Agent-submitted lead</span>
                        </div>
                        {lead.verificationStatus === 'pending' && (
                            <div className="flex gap-2">
                                <button onClick={() => verifyLead.mutate({ action: 'accept' })}
                                    className="btn-sm bg-green-50 text-green-600 hover:bg-green-100 rounded-xl font-bold flex items-center gap-1 py-1.5 px-3 transition-colors">
                                    <CheckCircle size={14} /> Accept
                                </button>
                                <button onClick={() => setShowRejectForm(!showRejectForm)}
                                    className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold flex items-center gap-1 py-1.5 px-3 transition-colors">
                                    <XCircle size={14} /> Reject
                                </button>
                            </div>
                        )}
                    </div>
                    {showRejectForm && (
                        <div className="mt-3 flex gap-2">
                            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                                className="form-input flex-1" placeholder="Reason for rejection..." />
                            <button onClick={() => verifyLead.mutate({ action: 'reject', reason: rejectReason })}
                                disabled={!rejectReason} className="btn-primary btn-sm">Submit</button>
                        </div>
                    )}
                    {lead.verificationStatus === 'rejected' && lead.rejectionReason && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                            <strong>Reason:</strong> {lead.rejectionReason}
                        </div>
                    )}
                </div>
            )}

            <div className="px-6 py-3 border-b border-border flex gap-2">
                <button onClick={() => setShowWaModal(true)}
                    className="flex-1 btn-sm bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-bold flex items-center justify-center gap-1.5 py-2 transition-colors">
                    <MessageCircle size={14} /> WhatsApp
                </button>
                <select value={lead.status} onChange={(e) => updateStatus.mutate(e.target.value)}
                    className="flex-1 form-select text-xs font-bold py-2">
                    {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            {/* Tabs */}
            <div className="px-6 py-2 border-b border-border flex gap-1">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === tab.id ? 'bg-teal/10 text-teal' : 'text-muted hover:bg-gray-100'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeTab === 'details' && (
                    <div className="space-y-6">
                        {/* Contact */}
                        <section>
                            <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Contact</h4>
                            <div className="space-y-1">
                                <div className="py-2">
                                    <div className="text-[10px] font-bold text-muted uppercase mb-1">Phone</div>
                                    <PhoneLink countryCode={lead.countryCode} phone={lead.phone} altPhone={lead.altPhone} altCountryCode={lead.altCountryCode} />
                                </div>
                                <InfoRow icon={Mail} label="Email" value={lead.email} />
                                <InfoRow icon={MapPin} label="Location" value={[lead.city, lead.country].filter(Boolean).join(', ')} />
                            </div>
                        </section>

                        {/* Medical */}
                        <section>
                            <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Medical</h4>
                            <div className="space-y-1">
                                {lead.medicalIssue && (
                                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm">{lead.medicalIssue}</div>
                                )}
                                <InfoRow icon={Building2} label="Hospital" value={lead.hospitalName} />
                                <InfoRow icon={Stethoscope} label="Department" value={lead.departmentName} />
                                <InfoRow icon={User} label="Doctor" value={lead.doctorName} />
                                <InfoRow icon={DollarSign} label="Approx Amount" value={lead.approximateAmount ? formatCurrency(lead.approximateAmount, lead.currency) : null} />
                                <InfoRow icon={Calendar} label="Est. Travel Date" value={lead.estimatedTravelDate ? formatDate(lead.estimatedTravelDate) : null} />
                            </div>
                        </section>

                        {/* Agent */}
                        {lead.agentName && (
                            <section>
                                <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Agent / Referrer</h4>
                                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                                    <Briefcase size={16} className="text-purple-600" />
                                    <span className="text-sm font-semibold">{lead.agentName}</span>
                                </div>
                            </section>
                        )}

                        {/* Quick Note */}
                        <section>
                            <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Add Note</h4>
                            <div className="flex gap-2">
                                <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
                                    className="form-input flex-1" placeholder="Type a note..."
                                    onKeyDown={(e) => { if (e.key === 'Enter' && noteText) addNote.mutate(noteText); }} />
                                <button onClick={() => noteText && addNote.mutate(noteText)} disabled={!noteText || addNote.isPending}
                                    className="btn-primary btn-sm"><Send size={14} /></button>
                            </div>
                        </section>

                        {/* Visa Letter Upload (advisor) */}
                        {isAgentSubmitted && (
                            <section>
                                <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Visa Invite Letter</h4>
                                <label className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-teal/40 transition-colors block">
                                    <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                                    <div className="text-sm font-medium text-slate-600">Upload Visa Invite Letter</div>
                                    <div className="text-xs text-slate-400">This will be visible to the agent</div>
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                                        onChange={(e) => e.target.files[0] && uploadVisa.mutate(e.target.files[0])} />
                                </label>
                                {documents?.filter(d => d.docType === 'visa_invite_letter').map(doc => (
                                    <div key={doc.id} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 mt-2 border border-green-200">
                                        <FileText size={14} className="text-green-600" />
                                        <span className="text-sm flex-1 truncate">{doc.fileName}</span>
                                    </div>
                                ))}
                            </section>
                        )}
                    </div>
                )}

                {activeTab === 'visa' && (
                    <VisaLetterSection lead={lead} onEmailHospital={handleEmailToHospital} />
                )}

                {activeTab === 'attendants' && (
                    <div className="space-y-4">
                        {(!leadAttendants || leadAttendants.length === 0) ? (
                            <div className="text-center py-8 text-muted text-sm">No attendants recorded</div>
                        ) : (
                            leadAttendants.map((att, i) => (
                                <div key={att.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                    <div className="text-xs font-bold text-muted uppercase mb-2">Attendant {i + 1}</div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-xs text-muted">Name</span><div className="font-medium">{att.name}</div></div>
                                        <div><span className="text-xs text-muted">DOB</span><div>{att.dateOfBirth || '-'}</div></div>
                                        <div><span className="text-xs text-muted">Passport</span><div className="font-mono text-xs">{att.passportNumber || '-'}</div></div>
                                        <div><span className="text-xs text-muted">Relationship</span><div className="capitalize">{att.relationship || '-'}</div></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-4">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="form-label">Document Type</label>
                                <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} className="form-select">
                                    {DOCUMENT_TYPES.map(d => <option key={d.value} value={d.value}>{d.icon} {d.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <FileUpload onUpload={(file) => uploadDoc.mutate(file)} />

                        <div className="space-y-2 mt-4">
                            {documents?.length === 0 && (
                                <div className="text-center py-8 text-muted text-sm">No documents uploaded yet</div>
                            )}
                            {documents?.map(doc => (
                                <FileItem key={doc.id} name={doc.fileName} type={doc.mimeType} size={doc.fileSize}
                                    onRemove={() => { if (confirm('Delete this document?')) deleteDoc.mutate(doc.id); }} />
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="space-y-4">
                        {lead.activities?.length === 0 && (
                            <div className="text-center py-8 text-muted text-sm">No activity yet</div>
                        )}
                        {lead.activities?.map((activity) => (
                            <div key={activity.id} className="relative pl-6 pb-4 border-l-2 border-gray-100 last:border-0">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-teal" />
                                <div className="text-xs font-bold uppercase text-text">{activity.type.replace(/_/g, ' ')}</div>
                                <div className="text-sm text-gray-600 mb-1">{activity.description}</div>
                                <div className="flex items-center gap-2 text-[10px] text-muted">
                                    <Clock size={10} />
                                    {timeAgo(activity.createdAt)}
                                    {activity.performedByName && <span>· {activity.performedByName}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Hospital Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                    <Mail className="text-amber-500" size={24} />
                                    Email Composer
                                </h3>
                                <p className="text-xs text-muted font-medium mt-0.5">Prepare and send the Visa Invitation Letter request</p>
                            </div>
                            <button onClick={() => setShowEmailModal(false)} className="p-2.5 hover:bg-gray-200 rounded-xl transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Recipients */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest block">Available Contacts</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    let parsedEmailIds = lead.hospitalEmailIds;
                                                    if (typeof parsedEmailIds === 'string') {
                                                        try { parsedEmailIds = JSON.parse(parsedEmailIds); } catch { parsedEmailIds = []; }
                                                    }
                                                    const all = [lead.hospitalEmail, ...(Array.isArray(parsedEmailIds) ? parsedEmailIds : [])].filter(Boolean);
                                                    setSelectedEmails(all);
                                                }}
                                                className="text-[9px] font-bold text-teal hover:underline"
                                            >Select All</button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedEmails([])}
                                                className="text-[9px] font-bold text-red-400 hover:underline"
                                            >Clear</button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100 italic text-[10px] text-muted min-h-[50px] flex items-center justify-center">
                                        {(() => {
                                            // Parse hospitalEmailIds - could be array or JSON string
                                            let parsedEmailIds = lead.hospitalEmailIds;
                                            if (typeof parsedEmailIds === 'string') {
                                                try { parsedEmailIds = JSON.parse(parsedEmailIds); } catch { parsedEmailIds = []; }
                                            }
                                            const allEmails = [lead.hospitalEmail, ...(Array.isArray(parsedEmailIds) ? parsedEmailIds : [])].filter(Boolean);
                                            if (allEmails.length === 0) return <span>No pre-configured emails found</span>;
                                            return allEmails.map(email => (
                                                <button
                                                    key={email}
                                                    type="button"
                                                    onClick={() => {
                                                        if (selectedEmails.includes(email)) {
                                                            setSelectedEmails(selectedEmails.filter(e => e !== email));
                                                        } else {
                                                            setSelectedEmails([...selectedEmails, email]);
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedEmails.includes(email)
                                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                        : 'bg-white text-slate-500 border-slate-200 opacity-60'
                                                        }`}
                                                >
                                                    {email}
                                                </button>
                                            ));
                                        })()}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">Manual Entry</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={customEmail}
                                            onChange={(e) => setCustomEmail(e.target.value)}
                                            className="form-input flex-1 font-medium px-4 py-2 rounded-xl border-gray-200 focus:ring-amber-500 text-sm"
                                            placeholder="Enter extra email address..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && customEmail.includes('@')) {
                                                    e.preventDefault();
                                                    if (!selectedEmails.includes(customEmail)) {
                                                        setSelectedEmails([...selectedEmails, customEmail]);
                                                    }
                                                    setCustomEmail('');
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (customEmail.includes('@')) {
                                                    if (!selectedEmails.includes(customEmail)) {
                                                        setSelectedEmails([...selectedEmails, customEmail]);
                                                    }
                                                    setCustomEmail('');
                                                }
                                            }}
                                            className="btn-sm bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl px-4 font-bold border border-amber-100"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted mt-1.5 px-1">Type an email and click Add or press Enter to include additional recipients.</p>
                                </div>

                                {selectedEmails.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
                                        <div className="text-[10px] font-bold text-amber-600 w-full mb-1">SELECTED RECIPIENTS:</div>
                                        {selectedEmails.map(email => (
                                            <span key={email} className="bg-amber-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                                                {email}
                                                <button type="button" onClick={() => setSelectedEmails(selectedEmails.filter(e => e !== email))} className="hover:text-amber-200">
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">Subject</label>
                                <input
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="form-input w-full font-semibold px-4 py-3 rounded-xl border-gray-200 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                                    placeholder="Enter subject..."
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">Email Body</label>
                                <textarea
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    rows={10}
                                    className="form-input w-full px-4 py-3 rounded-xl border-gray-200 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                                    style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", fontSize: '13px', lineHeight: '1.7', color: '#334155' }}
                                    placeholder="Write your email here..."
                                />
                            </div>

                            {/* Attachment Info */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 block">Attachments</label>

                                {/* Auto-attached VIL */}
                                <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 bg-teal text-white rounded-xl flex items-center justify-center shrink-0">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-teal-800">Visa Invitation Request PDF</div>
                                        <div className="text-[10px] text-teal-600 truncate">Automatically generated and attached</div>
                                    </div>
                                    <div className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold">REQUIRED</div>
                                </div>

                                {/* Extra Attachments Picker */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[10px] text-muted font-medium italic">Select additional documents to attach:</p>
                                        <label className="cursor-pointer bg-teal/10 text-teal px-3 py-1 rounded-lg text-[9px] font-bold hover:bg-teal/20 transition-all">
                                            + Upload & Attach
                                            <input
                                                type="file"
                                                className="hidden"
                                                multiple
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files);
                                                    files.forEach(file => uploadAttachment(file));
                                                    e.target.value = ''; // Reset for next selection
                                                }}
                                            />
                                        </label>
                                    </div>
                                    {!documents ? (
                                        <div className="text-[10px] text-muted italic text-center py-3 bg-gray-50 rounded-xl border border-gray-100">
                                            Loading documents...
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto px-1 custom-scrollbar pb-1">
                                            {documents.filter(d => d.docType !== 'visa_invite_letter').map(doc => (
                                                <button
                                                    key={doc.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (selectedAttachmentIds.includes(doc.id)) {
                                                            setSelectedAttachmentIds(selectedAttachmentIds.filter(id => id !== doc.id));
                                                        } else {
                                                            setSelectedAttachmentIds([...selectedAttachmentIds, doc.id]);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left ${selectedAttachmentIds.includes(doc.id)
                                                        ? 'bg-amber-50 border-amber-200'
                                                        : 'bg-white border-gray-100 hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedAttachmentIds.includes(doc.id) ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                                        {doc.mimeType?.includes('image') ? <Camera size={12} /> : <FileText size={12} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-bold text-slate-700 truncate">{doc.fileName}</div>
                                                        <div className="text-[8px] text-muted capitalize truncate">{doc.docType?.replace(/_/g, ' ')}</div>
                                                    </div>
                                                    {selectedAttachmentIds.includes(doc.id) && <CheckCircle size={12} className="text-amber-500" />}
                                                </button>
                                            ))}
                                            {documents.filter(d => d.docType !== 'visa_invite_letter').length === 0 && (
                                                <div className="col-span-2 text-[10px] text-muted italic text-center py-3 bg-gray-50 rounded-xl border border-gray-100">
                                                    No additional documents found.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <span className="text-xs text-muted italic">Sending as <strong>marketing@easyheals.com</strong></span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowEmailModal(false)}
                                    className="px-6 py-2.5 text-xs font-bold text-slate-600 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => sendVisaEmail.mutate({
                                        recipientEmails: selectedEmails,
                                        subject: emailSubject,
                                        body: emailBody,
                                        attachmentIds: selectedAttachmentIds
                                    })}
                                    disabled={selectedEmails.length === 0 || sendVisaEmail.isPending}
                                    className="px-8 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg shadow-amber-200"
                                >
                                    {sendVisaEmail.isPending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                                    Send Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── WhatsApp Template Picker Modal ──────────────────────────────────────────

function WhatsAppTemplateModal({ lead, onClose }) {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [messageText, setMessageText] = useState('');

    const { data: templates } = useQuery({
        queryKey: ['wa-templates'],
        queryFn: () => api.get('/whatsapp/templates').then(r => r.data),
    });

    const applyTemplate = (template) => {
        setSelectedTemplate(template);
        let text = template.bodyText;
        // Auto-fill variables
        text = text.replace(/\{\{name\}\}/g, lead.name || '');
        text = text.replace(/\{\{phone\}\}/g, lead.phone || '');
        text = text.replace(/\{\{refId\}\}/g, lead.refId || '');
        text = text.replace(/\{\{hospital\}\}/g, lead.hospitalName || '');
        text = text.replace(/\{\{department\}\}/g, lead.departmentName || '');
        text = text.replace(/\{\{doctor\}\}/g, lead.doctorName || '');
        setMessageText(text);
    };

    const sendMessage = () => {
        const cleanPhone = (lead.phone || '').replace(/[\s\-()]/g, '');
        const cleanCode = (lead.countryCode || '+91').replace('+', '');
        const fullPhone = `${cleanCode}${cleanPhone}`;
        const encoded = encodeURIComponent(messageText);
        const url = `https://wa.me/${fullPhone}${messageText ? `?text=${encoded}` : ''}`;
        window.open(url, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
            <div className="bg-white rounded-t-2xl lg:rounded-2xl w-full lg:max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <MessageCircle size={18} className="text-emerald-600" /> Send WhatsApp
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* To */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm">{lead.name?.[0]}</div>
                        <div>
                            <div className="font-semibold text-sm">{lead.name}</div>
                            <div className="text-xs text-muted">{lead.countryCode} {lead.phone}</div>
                        </div>
                    </div>

                    {/* Template Picker */}
                    <div>
                        <label className="form-label">Select Template (optional)</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {templates?.map(t => (
                                <button key={t.id}
                                    onClick={() => applyTemplate(t)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${selectedTemplate?.id === t.id ? 'border-emerald-500 bg-emerald-50' : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50'}`}>
                                    <div className="font-semibold mb-0.5">{t.name}</div>
                                    <div className="text-xs text-muted line-clamp-2">{t.bodyText}</div>
                                </button>
                            ))}
                            {(!templates || templates.length === 0) && (
                                <div className="text-center py-4 text-muted text-sm">No templates available. Type a custom message below.</div>
                            )}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label className="form-label">Message</label>
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            rows={4}
                            className="form-input resize-none"
                            placeholder="Type your message here or select a template above..."
                        />
                        <p className="text-[10px] text-muted mt-1">Variables like {'{{name}}'}, {'{{phone}}'}, {'{{refId}}'} are auto-filled from lead data.</p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-border flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={sendMessage} className="flex-1 btn-sm bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-bold flex items-center justify-center gap-2 py-2.5 transition-colors">
                        <Send size={14} /> Open WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Visa Letter Data Section ────────────────────────────────────────────────

const EMPTY_PERSON = { surname: '', givenName: '', passportNo: '', dateOfBirth: '', gender: '', nationality: '', address: '', contactNumber: '', email: '' };
const EMPTY_PATIENT = { ...EMPTY_PERSON, doctorSpeciality: '', departmentName: '', appointmentDate: '', doctorMeetName: '' };
const EMPTY_ATTENDANT = { ...EMPTY_PERSON, relationship: '' };

const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
];

function VisaLetterSection({ lead, onEmailHospital }) {
    const queryClient = useQueryClient();
    const user = useAuth(state => state.user);
    const canFreeze = ['owner', 'admin', 'advisor'].includes(user?.role);
    const isFrozen = !!lead.visaDataFrozen;

    // Initialize with auto-populated values from lead
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
        departmentName: lead.departmentName || '',
        appointmentDate: lead.appointmentDate || '',
        doctorMeetName: lead.doctorName || '',
    };

    const [data, setData] = useState({
        patient: { ...autoPatient, ...(existing.patient || {}) },
        attendant1: { ...EMPTY_ATTENDANT, ...(existing.attendant1 || {}) },
        attendant2: { ...EMPTY_ATTENDANT, ...(existing.attendant2 || {}) },
        attendant3: { ...EMPTY_ATTENDANT, ...(existing.attendant3 || {}) },
    });

    // CRITICAL: Sync local state when lead prop changes (e.g. switching between leads)
    useEffect(() => {
        const revisedExisting = lead.visaLetterData || {};
        const revisedNameParts = (lead.name || '').split(' ');
        const revGiven = revisedNameParts.length > 1 ? revisedNameParts.slice(0, -1).join(' ') : lead.name || '';
        const revSur = revisedNameParts.length > 1 ? revisedNameParts[revisedNameParts.length - 1] : '';

        const revAuto = {
            ...EMPTY_PATIENT,
            surname: revSur,
            givenName: revGiven,
            dateOfBirth: lead.dateOfBirth || '',
            gender: lead.gender || '',
            passportNo: lead.passportNumber || '',
            contactNumber: lead.phone || '',
            email: lead.email || '',
            nationality: lead.country || '',
            address: lead.nativeAddress || '',
            departmentName: lead.departmentName || '',
            appointmentDate: lead.appointmentDate || '',
            doctorMeetName: lead.doctorName || '',
        };

        setData({
            patient: { ...revAuto, ...(revisedExisting.patient || {}) },
            attendant1: { ...EMPTY_ATTENDANT, ...(revisedExisting.attendant1 || {}) },
            attendant2: { ...EMPTY_ATTENDANT, ...(revisedExisting.attendant2 || {}) },
            attendant3: { ...EMPTY_ATTENDANT, ...(revisedExisting.attendant3 || {}) },
        });
        setEditing(false); // Reset editing mode when switching leads
    }, [lead.id, lead.visaLetterData, lead.name]);

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [scanning, setScanning] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

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
            setEditing(true); // Auto-enter edit mode so user sees the Save button
            toast.success('Document scanned and fields auto-filled. Don\'t forget to SAVE!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to scan document');
        } finally {
            setScanning(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const fullName = `${data.patient.givenName} ${data.patient.surname}`.trim();
            const payload = {
                visaLetterData: data,
                // Sync patient data to top-level lead fields
                name: fullName,
                passportNumber: data.patient.passportNo,
                dateOfBirth: data.patient.dateOfBirth,
                gender: data.patient.gender,
                country: data.patient.nationality,
                nativeAddress: data.patient.address,
                phone: data.patient.contactNumber,
                email: data.patient.email,

                // Sync new fields
                departmentName: data.patient.departmentName,
                appointmentDate: data.patient.appointmentDate,
                doctorName: data.patient.doctorMeetName,
            };

            await api.patch(`/leads/${lead.id}`, payload);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
            toast.success('Visa information saved and lead profile updated');
            setEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleFreeze = async (freeze) => {
        try {
            await api.post(`/leads/${lead.id}/visa-data/${freeze ? 'freeze' : 'unfreeze'}`);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
            toast.success(freeze ? 'Visa data locked' : 'Visa data unlocked');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed');
        }
    };

    const updateField = (section, field, value) => {
        setData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    };

    const countFilled = (obj) => {
        return Object.values(obj).filter(v => v && String(v).trim()).length;
    };

    const RELATIONSHIPS = [
        { value: 'spouse', label: 'Spouse' },
        { value: 'parent', label: 'Parent' },
        { value: 'child', label: 'Child' },
        { value: 'sibling', label: 'Sibling' },
        { value: 'relative', label: 'Relative' },
        { value: 'friend', label: 'Friend' },
        { value: 'other', label: 'Other' }
    ];

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
        departmentName: { label: "Department Name" },
        appointmentDate: { label: "Appointment Date", type: "date" },
        doctorMeetName: { label: "Dr to meet" },
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
            {/* Header with freeze/edit controls */}
            <div className="flex flex-col gap-3 py-2 border-b border-gray-100 mb-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                        <Shield size={12} className="text-teal" /> Visa Letter Management
                    </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                    {canFreeze && (
                        <button
                            onClick={() => handleFreeze(!isFrozen)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all shadow-sm ${isFrozen
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
                                : 'bg-gray-100 text-slate-600 hover:bg-gray-200 border border-gray-200'
                                }`}
                        >
                            {isFrozen ? <><Unlock size={14} /> Unfreeze Data</> : <><Lock size={14} /> Lock / Freeze</>}
                        </button>
                    )}
                    {!isFrozen && (
                        editing ? (
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold bg-teal text-white hover:bg-teal-dark transition-all shadow-sm">
                                <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        ) : (
                            <button onClick={() => setEditing(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold bg-teal-50 text-teal hover:bg-teal-100 border border-teal-100 transition-all shadow-sm">
                                <Edit3 size={14} /> Edit Info
                            </button>
                        )
                    )}
                    <button
                        onClick={() => setShowPreview(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-sm"
                    >
                        <FileText size={14} /> View Letter
                    </button>
                    {isFrozen && (
                        <button
                            onClick={() => onEmailHospital()}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-all shadow-sm"
                        >
                            <Mail size={14} /> Email Hospital
                        </button>
                    )}
                </div>
            </div>

            {showPreview && (
                <VisaLetterPreview lead={lead} data={data} onClose={() => setShowPreview(false)} />
            )}

            {/* Frozen Banner */}
            {isFrozen && (
                <div className="flex flex-col gap-1 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                        <Lock size={14} />
                        <span><strong>Locked</strong> — This information has been frozen and cannot be edited.</span>
                    </div>
                    {lead.visaDataFrozenAt && (
                        <div className="text-[10px] text-blue-600/70 ml-5 font-bold uppercase tracking-wider">
                            Finalized on: {new Date(lead.visaDataFrozenAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </div>
            )}

            <PersonCard
                title="Patient Details" sectionKey="patient" fields={patientFields} icon="🧑‍⚕️"
                data={data} setData={setData} editing={editing} isFrozen={isFrozen}
                scanning={scanning} processFile={handleScan}
            />
            <PersonCard
                title="Details of Attendant 1" sectionKey="attendant1" fields={attendantFields} icon="👤"
                data={data} setData={setData} editing={editing} isFrozen={isFrozen}
                scanning={scanning} processFile={handleScan}
            />
            <PersonCard
                title="Details of Attendant 2" sectionKey="attendant2" fields={attendantFields} icon="👤"
                data={data} setData={setData} editing={editing} isFrozen={isFrozen}
                scanning={scanning} processFile={handleScan}
            />
            <PersonCard
                title="Details of Attendant 3" sectionKey="attendant3" fields={attendantFields} icon="👤"
                data={data} setData={setData} editing={editing} isFrozen={isFrozen}
                scanning={scanning} processFile={handleScan}
            />

            {editing && !isFrozen && (
                <button onClick={handleSave} disabled={saving}
                    className="w-full btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2">
                    <Save size={16} /> {saving ? 'Saving Visa Data...' : 'Save All Visa Information'}
                </button>
            )}
        </div>
    );
}

// ─── Visa Letter Preview Modal ───────────────────────────────────────────────

// ─── Person Card Component ───────────────────────────────────────────────

const PersonCard = ({ title, sectionKey, data, setData, fields, icon, editing, isFrozen, scanning, processFile }) => {
    const sectionData = data[sectionKey];
    const fileInputRef = React.useRef();
    const [isDragOver, setIsDragOver] = React.useState(false);

    const updateField = (sKey, fKey, val) => {
        setData(prev => ({
            ...prev,
            [sKey]: { ...prev[sKey], [fKey]: val }
        }));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        processFile(sectionKey, file);
    };

    const handlePaste = (e) => {
        if (isFrozen) return;
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                processFile(sectionKey, file);
                toast('📋 Pasted image — scanning...', { duration: 1500 });
                break;
            }
        }
    };

    return (
        <div
            className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-4"
            onPaste={handlePaste}
        >
            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-600 flex items-center gap-2">
                    <span className="text-base">{icon}</span> {title}
                </h5>
                {!isFrozen && (
                    <div className="flex gap-2 items-center">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={(e) => e.target.files[0] && processFile(sectionKey, e.target.files[0])}
                        />
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-dashed transition-all cursor-pointer text-[10px] font-bold
                                ${isDragOver
                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700 scale-105'
                                    : 'border-indigo-200 bg-indigo-50/60 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-100'
                                }`}
                            onClick={() => fileInputRef.current.click()}
                        >
                            {scanning === sectionKey
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Scan size={12} />
                            }
                            {scanning === sectionKey ? 'Scanning...' : isDragOver ? 'Drop file' : 'Scan Passport'}
                        </div>
                    </div>
                )}
            </div>
            {!isFrozen && (
                <div className="px-4 pt-2 pb-0 text-[10px] text-muted flex items-center gap-1">
                    <Camera size={10} />
                    <span>Tip: <kbd className="bg-gray-100 px-1 rounded font-mono">Ctrl+V</kbd> to paste, or drag & drop</span>
                </div>
            )}
            <div className={`p-4 grid grid-cols-2 gap-4 ${!isFrozen ? 'pt-2' : ''}`}>
                {Object.entries(fields).map(([key, config]) => (
                    <div key={key} className={config.fullWidth ? 'col-span-2' : ''}>
                        <label className="block text-[10px] font-bold text-muted mb-1 uppercase tracking-tight">
                            {config.label}{config.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {!editing || isFrozen ? (
                            <div className="text-sm text-slate-700 min-h-[1.5rem] border-b border-gray-50 pb-1">
                                {config.type === 'select'
                                    ? config.options.find(o => o.value === sectionData[key])?.label || '—'
                                    : sectionData[key] || '—'}
                            </div>
                        ) : config.type === 'select' ? (
                            <select
                                value={sectionData[key] || ''}
                                onChange={e => updateField(sectionKey, key, e.target.value)}
                                className={`w-full border rounded-lg px-3 py-1.5 text-sm ${config.required && !sectionData[key] ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}
                            >
                                <option value="">Select...</option>
                                {config.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        ) : (
                            <input
                                type={config.type || 'text'}
                                value={sectionData[key] || ''}
                                onChange={e => updateField(sectionKey, key, e.target.value)}
                                className={`w-full border rounded-lg px-3 py-1.5 text-sm ${config.required && !sectionData[key] ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

function VisaLetterPreview({ lead, data, onClose }) {
    const printRef = React.useRef();

    const handlePrint = () => {
        const content = printRef.current;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Visa Letter - ${data.patient.givenName} ${data.patient.surname}</title>
                <style>
                    body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; line-height: 1.4; font-size: 13px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
                    th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; word-wrap: break-word; }
                    th { background: #f9f9f9; width: 45%; font-weight: bold; }
                    @media print { body { padding: 0; } .no-print { display: none; } }
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    const renderTable = (person, title, type = 'attendant') => {
        if (!person || (!person.surname && !person.givenName && !person.passportNo)) return null;

        const rows = type === 'patient' ? [
            ['Patient Surname *', person.surname],
            ['Patient Given Name *', person.givenName],
            ['Gender *', person.gender],
            ['Date of Birth (DD/MM/YYYY) *', person.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString('en-GB') : ''],
            ['Nationality *', person.nationality],
            ['Passport No *', person.passportNo],
            ['Address *', person.address],
            ['Contact Number *', person.contactNumber],
            ['Email id *', person.email],
            ['Diagnosis/ Proposed Treatment *', person.doctorSpeciality],
            ['Department Name *', person.departmentName || 'Medical'],
            ['Appointment date *', person.appointmentDate ? new Date(person.appointmentDate).toLocaleDateString('en-GB') : ''],
            ['Dr to meet *', person.doctorMeetName || 'Senior Consultant'],
        ] : [
            [`${title} Surname *`, person.surname],
            [`${title} Given Name *`, person.givenName],
            [`${title} Passport No *`, person.passportNo],
            ['Gender *', person.gender],
            ['Date of Birth (DD/MM/YYYY) *', person.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString('en-GB') : ''],
            ['Address *', person.address],
            ['Relationship between Patient & Attendant', person.relationship],
        ];

        return (
            <div key={title} className="mb-6">
                <table className="w-full text-sm">
                    <tbody>
                        {rows.map(([label, value]) => (
                            <tr key={label}>
                                <th className="border border-black bg-gray-50 text-left px-3 py-2 font-bold">{label}</th>
                                <td className="border border-black px-3 py-2">{value || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText size={18} className="text-teal" /> Visa Invitation Letter Preview
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="btn-primary flex items-center gap-2 shadow-lg">
                            <Printer size={16} /> Print / PDF
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg"><X size={18} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-gray-200 flex justify-center">
                    <div ref={printRef} className="bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-xl text-black text-left">
                        {renderTable(data.patient, 'Patient Details', 'patient')}
                        {renderTable(data.attendant1, 'Attendant 1')}
                        {renderTable(data.attendant2, 'Attendant 2')}
                        {renderTable(data.attendant3, 'Attendant 3')}
                    </div>
                </div>
            </div>
        </div>
    );
}
