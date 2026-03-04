import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { LEAD_STATUSES, LEAD_PAGE_STATUSES } from '../lib/constants';
import { formatCurrency, timeAgo, truncate, debounce } from '../lib/utils';
import StatusBadge from '../components/ui/StatusBadge';
import PhoneLink from '../components/ui/PhoneLink';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LeadForm from '../components/leads/LeadForm';
import LeadDetail from '../components/leads/LeadDetail';
import ImportLeads from '../components/leads/ImportLeads';
import {
    Plus, Search, Filter, Download, Archive, ChevronLeft,
    ChevronRight, MoreVertical, CheckSquare, Square, Eye, Upload, X, Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';

export default function Leads() {
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editLead, setEditLead] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showImport, setShowImport] = useState(false);

    // Filter states driven by URL
    const statusFilter = searchParams.get('status') || '';
    const followUpDueFilter = searchParams.get('followUpDue') === 'true';
    const dateFromFilter = searchParams.get('dateFrom') || '';

    const setFilter = (key, value) => {
        setSearchParams(prev => {
            if (value) prev.set(key, value);
            else prev.delete(key);
            return prev;
        });
        setPage(1);
    };

    const clearFilters = () => {
        setSearchParams({});
        setPage(1);
    };

    // Initial load for things like ?new=1
    useEffect(() => {
        if (searchParams.get('new') === '1') {
            setShowForm(true);
            // Optional: clear 'new' from URL after opening
            // setSearchParams(prev => { prev.delete('new'); return prev; });
        }
    }, [searchParams]);

    const debouncedSearch = useCallback(debounce((val) => {
        setSearch(val);
        setPage(1);
    }, 300), []);

    // Fetch leads
    const { data: leadsResponse, isLoading } = useQuery({
        queryKey: ['leads', { search, status: statusFilter, followUpDue: followUpDueFilter, dateFrom: dateFromFilter, page, limit: 20 }],
        queryFn: () => api.get('/leads', {
            params: {
                search,
                status: statusFilter || undefined,
                followUpDue: followUpDueFilter || undefined,
                dateFrom: dateFromFilter || undefined,
                page,
                limit: 20
            }
        }).then(r => r.data),
    });

    // Fetch single lead detail
    const { data: leadDetail } = useQuery({
        queryKey: ['lead', selectedLead?.id],
        queryFn: () => api.get(`/leads/${selectedLead.id}`).then(r => r.data),
        enabled: !!selectedLead?.id,
    });

    const leads = leadsResponse?.data || [];
    const totalPages = leadsResponse?.totalPages || 1;
    const total = leadsResponse?.total || 0;

    // Bulk archive
    const bulkArchive = useMutation({
        mutationFn: (ids) => api.post('/leads/bulk-archive', { ids }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); setSelectedIds([]); setShowArchiveConfirm(false); toast.success('Leads archived'); },
    });

    // CSV export
    const handleExport = () => {
        const params = new URLSearchParams({ search, status: statusFilter || '' });
        window.open(`${api.defaults.baseURL}/leads/export?${params.toString()}&token=${localStorage.getItem('token')}`, '_blank');
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === leads.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(leads.map(l => l.id));
        }
    };

    const handleEdit = (lead) => {
        setEditLead(lead);
        setShowForm(true);
    };

    return (
        <div className="page-container pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="page-title">Leads</h1>
                    <p className="page-subtitle">{total} leads {statusFilter ? `(${statusFilter.replace('_', ' ')})` : ''}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowImport(true)} className="btn-secondary btn-sm hidden sm:flex"><Upload size={14} /> Import</button>
                    <button onClick={handleExport} className="btn-secondary btn-sm"><Download size={14} /> Export</button>
                    <button onClick={() => { setEditLead(null); setShowForm(true); }} className="btn-primary btn-sm hidden sm:flex"><Plus size={14} /> New Lead</button>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-4">
                <div className="p-4 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            onChange={(e) => debouncedSearch(e.target.value)}
                            placeholder="Search by name, phone, email, ref ID..."
                            className="form-input pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select value={statusFilter} onChange={(e) => setFilter('status', e.target.value)} className="form-select w-auto">
                            <option value="">All Statuses</option>
                            {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Active Filters */}
                {(statusFilter || followUpDueFilter || dateFromFilter) && (
                    <div className="px-4 pb-4 flex flex-wrap gap-2">
                        {statusFilter && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal/10 text-teal text-[10px] font-bold uppercase tracking-wider">
                                Status: {statusFilter.replace('_', ' ')}
                                <button onClick={() => setFilter('status', '')} className="hover:bg-teal/20 p-0.5 rounded-full"><X size={12} /></button>
                            </span>
                        )}
                        {followUpDueFilter && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                                Follow-up Due
                                <button onClick={() => setFilter('followUpDue', '')} className="hover:bg-amber-500/20 p-0.5 rounded-full"><X size={12} /></button>
                            </span>
                        )}
                        {dateFromFilter && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                                From: {dateFromFilter}
                                <button onClick={() => setFilter('dateFrom', '')} className="hover:bg-blue-500/20 p-0.5 rounded-full"><X size={12} /></button>
                            </span>
                        )}
                        <button onClick={clearFilters} className="text-[10px] font-bold text-teal hover:underline ml-1">CLEAR ALL</button>
                    </div>
                )}

                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && (
                    <div className="px-4 py-3 bg-teal/5 border-t border-border flex items-center gap-3">
                        <span className="text-sm font-bold text-teal">{selectedIds.length} selected</span>
                        <div className="flex gap-2 ml-auto">
                            {isAdmin && (
                                <button onClick={() => setShowArchiveConfirm(true)} className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold transition-colors">
                                    <Archive size={14} /> Archive
                                </button>
                            )}
                            <button onClick={() => setSelectedIds([])} className="btn-ghost btn-sm">Clear</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-0 overflow-hidden relative min-h-[calc(100vh-200px)]">
                {/* Table / Cards */}
                <div className={`flex-1 min-w-0 transition-all ${selectedLead ? 'hidden 2xl:block' : ''}`}>
                    {/* Desktop Table */}
                    <div className="card hidden sm:block overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="table-header w-10">
                                            <button onClick={toggleSelectAll} className="hover:text-teal">
                                                {selectedIds.length === leads.length && leads.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </button>
                                        </th>
                                        <th className="table-header">Lead</th>
                                        <th className="table-header">Phone</th>
                                        <th className="table-header">Status</th>
                                        <th className="table-header">Hospital</th>
                                        <th className="table-header hidden lg:table-cell">Medical</th>
                                        <th className="table-header hidden xl:table-cell">Agent</th>
                                        <th className="table-header hidden xl:table-cell">Amount</th>
                                        <th className="table-header">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}><td colSpan={8} className="p-4"><div className="skeleton h-10 w-full" /></td></tr>
                                        ))
                                    ) : leads.length === 0 ? (
                                        <tr><td colSpan={8} className="text-center py-12 text-muted">No leads found</td></tr>
                                    ) : (
                                        leads.map(lead => (
                                            <tr key={lead.id} className="table-row" onClick={() => setSelectedLead(lead)}>
                                                <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={() => toggleSelect(lead.id)} className="hover:text-teal">
                                                        {selectedIds.includes(lead.id) ? <CheckSquare size={16} className="text-teal" /> : <Square size={16} />}
                                                    </button>
                                                </td>
                                                <td className="table-cell">
                                                    <div className="flex items-center justify-between group/row">
                                                        <div>
                                                            <div className="font-semibold">{lead.name}</div>
                                                            <div className="text-[10px] text-muted font-mono">{lead.refId}</div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedLead({ ...lead, _triggerEmail: true });
                                                            }}
                                                            className="p-1.5 bg-amber-50 text-amber-600 rounded-lg opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-amber-100"
                                                            title="Email Hospital"
                                                        >
                                                            <Mail size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="table-cell">
                                                    <PhoneLink countryCode={lead.countryCode} phone={lead.phone} showWhatsApp={true} />
                                                </td>
                                                <td className="table-cell"><StatusBadge status={lead.status} /></td>
                                                <td className="table-cell">
                                                    <div className="text-sm font-medium">{lead.hospitalName || '—'}</div>
                                                </td>
                                                <td className="table-cell hidden lg:table-cell">
                                                    <div className="text-sm">{truncate(lead.medicalIssue, 30)}</div>
                                                    <div className="text-xs text-muted">{lead.departmentName}</div>
                                                </td>
                                                <td className="table-cell hidden xl:table-cell text-sm text-muted">{lead.agentName || '—'}</td>
                                                <td className="table-cell hidden xl:table-cell text-sm font-medium">
                                                    {lead.approximateAmount ? formatCurrency(lead.approximateAmount, lead.currency) : '—'}
                                                </td>
                                                <td className="table-cell text-xs text-muted">{timeAgo(lead.createdAt)}</td>
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
                            <div className="text-center py-12 text-muted">No leads found</div>
                        ) : (
                            leads.map(lead => (
                                <div key={lead.id} onClick={() => setSelectedLead(lead)} className="mobile-card space-y-3 active:scale-[0.98] transition-transform">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-teal/10 text-teal rounded-xl flex items-center justify-center font-bold uppercase">{lead.name?.[0]}</div>
                                            <div>
                                                <div className="font-bold">{lead.name}</div>
                                                <div className="text-[10px] text-muted font-mono">{lead.refId}</div>
                                            </div>
                                        </div>
                                        <StatusBadge status={lead.status} size="xs" />
                                    </div>
                                    <PhoneLink countryCode={lead.countryCode} phone={lead.phone} altPhone={lead.altPhone} altCountryCode={lead.altCountryCode} />
                                    <div className="flex items-center justify-between text-xs text-muted">
                                        <span>{lead.medicalIssue ? truncate(lead.medicalIssue, 25) : lead.departmentName || '—'}</span>
                                        <span>{timeAgo(lead.createdAt)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
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

                {/* Lead Detail Side Panel */}
                {selectedLead && leadDetail && (
                    <LeadDetail lead={leadDetail} triggerEmail={selectedLead?._triggerEmail} onClose={() => setSelectedLead(null)} onEdit={handleEdit} />
                )}
            </div>

            {/* Lead Form Drawer */}
            <LeadForm isOpen={showForm} onClose={() => { setShowForm(false); setEditLead(null); }} editLead={editLead} key={editLead?.id || 'new'} />

            {/* Archive Confirm */}
            <ConfirmDialog
                isOpen={showArchiveConfirm}
                onClose={() => setShowArchiveConfirm(false)}
                onConfirm={() => bulkArchive.mutate(selectedIds)}
                title="Archive Leads"
                message={`Are you sure you want to archive ${selectedIds.length} lead(s)? They can be restored later.`}
                confirmLabel="Archive"
                loading={bulkArchive.isPending}
            />

            {/* Import Leads Drawer */}
            <ImportLeads isOpen={showImport} onClose={() => setShowImport(false)} />
        </div>
    );
}
