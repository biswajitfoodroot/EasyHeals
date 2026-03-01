import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { formatCurrency, timeAgo, truncate, debounce } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import PhoneLink from '../components/ui/PhoneLink';
import LeadDetail from '../components/leads/LeadDetail';
import { Search, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

export default function ClosedCases() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedLead, setSelectedLead] = useState(null);

    const debouncedSearch = useCallback(debounce((val) => {
        setSearch(val);
        setPage(1);
    }, 300), []);

    const { data: leadsResponse, isLoading } = useQuery({
        queryKey: ['closed-cases', { search, page }],
        queryFn: () => api.get('/leads', { params: { search, status: 'service_taken', page, limit: 20 } }).then(r => r.data),
    });

    const { data: leadDetail } = useQuery({
        queryKey: ['lead', selectedLead?.id],
        queryFn: () => api.get(`/leads/${selectedLead.id}`).then(r => r.data),
        enabled: !!selectedLead?.id,
    });

    const leads = leadsResponse?.data || [];
    const totalPages = leadsResponse?.totalPages || 1;
    const total = leadsResponse?.total || 0;

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <CheckCircle size={22} className="text-green-600" />
                        <h1 className="page-title">Closed Cases</h1>
                    </div>
                    <p className="page-subtitle">{total} completed cases (Service Taken)</p>
                </div>
            </div>

            <div className="card mb-4">
                <div className="p-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            onChange={(e) => debouncedSearch(e.target.value)}
                            placeholder="Search by name, phone, email, ref ID..."
                            className="form-input pl-10"
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-0">
                <div className={`flex-1 ${selectedLead ? 'hidden lg:block' : ''}`}>
                    {/* Desktop Table */}
                    <div className="card hidden sm:block overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="table-header">Patient</th>
                                        <th className="table-header">Phone</th>
                                        <th className="table-header">Status</th>
                                        <th className="table-header hidden lg:table-cell">Hospital</th>
                                        <th className="table-header hidden xl:table-cell">Amount</th>
                                        <th className="table-header">Closed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}><td colSpan={6} className="p-4"><div className="skeleton h-10 w-full" /></td></tr>
                                        ))
                                    ) : leads.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-muted">No closed cases found</td></tr>
                                    ) : (
                                        leads.map(lead => (
                                            <tr key={lead.id} className="table-row" onClick={() => setSelectedLead(lead)}>
                                                <td className="table-cell">
                                                    <div className="font-semibold">{lead.name}</div>
                                                    <div className="text-[10px] text-muted font-mono">{lead.refId}</div>
                                                </td>
                                                <td className="table-cell">
                                                    <PhoneLink countryCode={lead.countryCode} phone={lead.phone} showWhatsApp={true} />
                                                </td>
                                                <td className="table-cell"><StatusBadge status={lead.status} /></td>
                                                <td className="table-cell hidden lg:table-cell text-sm">{lead.hospitalName || '—'}</td>
                                                <td className="table-cell hidden xl:table-cell text-sm font-medium">
                                                    {lead.approximateAmount ? formatCurrency(lead.approximateAmount, lead.currency) : '—'}
                                                </td>
                                                <td className="table-cell text-xs text-muted">{timeAgo(lead.updatedAt || lead.createdAt)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-3">
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 w-full rounded-xl" />)
                        ) : leads.length === 0 ? (
                            <div className="text-center py-12 text-muted">No closed cases found</div>
                        ) : (
                            leads.map(lead => (
                                <div key={lead.id} onClick={() => setSelectedLead(lead)} className="mobile-card space-y-3 active:scale-[0.98] transition-transform">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center font-bold uppercase">{lead.name?.[0]}</div>
                                            <div>
                                                <div className="font-bold">{lead.name}</div>
                                                <div className="text-[10px] text-muted font-mono">{lead.refId}</div>
                                            </div>
                                        </div>
                                        <StatusBadge status={lead.status} size="xs" />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted">
                                        <span>{lead.hospitalName || lead.medicalIssue || '—'}</span>
                                        <span>{timeAgo(lead.updatedAt || lead.createdAt)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-muted">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm"><ChevronLeft size={14} /></button>
                                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm"><ChevronRight size={14} /></button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedLead && leadDetail && (
                    <LeadDetail lead={leadDetail} onClose={() => setSelectedLead(null)} onEdit={() => { }} />
                )}
            </div>
        </div>
    );
}
