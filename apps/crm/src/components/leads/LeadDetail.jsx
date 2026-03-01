import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import StatusBadge from '../ui/StatusBadge';
import PhoneLink from '../ui/PhoneLink';
import FileUpload, { FileItem } from '../ui/FileUpload';
import { LEAD_STATUSES, DOCUMENT_TYPES } from '../../lib/constants';
import { formatCurrency, formatDate, timeAgo, getWhatsAppUrl } from '../../lib/utils';
import {
    X, Edit3, Archive, MessageCircle, Mail, MapPin,
    Calendar, DollarSign, Building2, Stethoscope, User,
    FileText, Clock, Send, Plus, Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LeadDetail({ lead, onClose, onEdit }) {
    const queryClient = useQueryClient();
    const [noteText, setNoteText] = useState('');
    const [selectedDocType, setSelectedDocType] = useState('other');
    const [activeTab, setActiveTab] = useState('details');

    const { data: documents } = useQuery({
        queryKey: ['documents', lead?.id],
        queryFn: () => api.get(`/leads/${lead.id}/documents`).then(r => r.data),
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

    if (!lead) return null;

    const tabs = [
        { id: 'details', label: 'Details' },
        { id: 'documents', label: `Docs (${documents?.length || 0})` },
        { id: 'activity', label: 'Activity' },
    ];

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

            {/* Quick Actions */}
            <div className="px-6 py-3 border-b border-border flex gap-2">
                <a href={getWhatsAppUrl(lead.countryCode, lead.phone)} target="_blank" rel="noopener noreferrer"
                    className="flex-1 btn-sm bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-bold flex items-center justify-center gap-1.5 py-2 transition-colors">
                    <MessageCircle size={14} /> WhatsApp
                </a>
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
        </div>
    );
}
