import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { API_BASE } from '../lib/api';
import { getStatusConfig, getVerificationConfig } from '../lib/constants';
import { ArrowLeft, Download, Printer, FileText, Users, Plane, Building2, Clock, CheckCircle, XCircle } from 'lucide-react';

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
