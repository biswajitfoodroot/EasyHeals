import React, { useState } from 'react';
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
    CheckCircle, XCircle, Upload, Printer, Users, Plane, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeadDetail({ lead, onClose, onEdit }) {
    const queryClient = useQueryClient();
    const [noteText, setNoteText] = useState('');
    const [selectedDocType, setSelectedDocType] = useState('other');
    const [activeTab, setActiveTab] = useState('details');
    const [showWaModal, setShowWaModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

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

    if (!lead) return null;

    const tabs = [
        { id: 'details', label: 'Details' },
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
        <div className="fixed inset-0 lg:relative lg:inset-auto w-full lg:w-[420px] bg-white lg:border-l border-border flex flex-col shadow-2xl z-40 animate-slide-in-right">
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

            {/* Quick Actions */}
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

            {/* WhatsApp Template Modal */}
            {showWaModal && (
                <WhatsAppTemplateModal lead={lead} onClose={() => setShowWaModal(false)} />
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
