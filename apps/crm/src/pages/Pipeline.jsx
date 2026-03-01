import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { LEAD_STATUSES, PIPELINE_STATUSES } from '../lib/constants';
import StatusBadge from '../components/ui/StatusBadge';
import { timeAgo, formatCurrency, truncate } from '../lib/utils';
import PhoneLink from '../components/ui/PhoneLink';

export default function Pipeline() {
    const { data: stats } = useQuery({
        queryKey: ['lead-stats'],
        queryFn: () => api.get('/leads/stats').then(r => r.data),
    });

    // Only show active pipeline statuses (valid → visited)
    const statusGroups = LEAD_STATUSES.filter(s => PIPELINE_STATUSES.includes(s.value));

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="mb-6">
                <h1 className="page-title">Pipeline</h1>
                <p className="page-subtitle">Drag-free visual pipeline — click cards to manage</p>
            </div>

            {/* Desktop: Horizontal pipeline */}
            <div className="hidden lg:flex gap-3 overflow-x-auto pb-4">
                {statusGroups.map(status => (
                    <PipelineColumn key={status.value} status={status} count={stats?.byStatus?.[status.value] || 0} />
                ))}
            </div>

            {/* Mobile: Accordion */}
            <div className="lg:hidden space-y-3">
                {statusGroups.map(status => (
                    <PipelineAccordion key={status.value} status={status} count={stats?.byStatus?.[status.value] || 0} />
                ))}
            </div>
        </div>
    );
}

function PipelineColumn({ status, count }) {
    const { data: leadsRes } = useQuery({
        queryKey: ['leads', 'pipeline', status.value],
        queryFn: () => api.get('/leads', { params: { status: status.value, limit: 50 } }).then(r => r.data),
    });

    const leads = leadsRes?.data || [];

    return (
        <div className="flex-shrink-0 w-64 bg-gray-50 rounded-2xl p-3 border border-border">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${status.dotClass}`} />
                <span className="text-xs font-bold uppercase tracking-wider">{status.label}</span>
                <span className="ml-auto text-xs font-bold bg-white rounded-full px-2 py-0.5 text-muted border border-border">{count}</span>
            </div>

            {/* Cards */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {leads.map(lead => (
                    <Link key={lead.id} to="/leads" className="block bg-white rounded-xl p-3 border border-border hover:shadow-md transition-shadow">
                        <div className="font-semibold text-sm mb-1">{lead.name}</div>
                        <div className="text-[10px] text-muted font-mono mb-2">{lead.refId}</div>
                        {lead.medicalIssue && (
                            <div className="text-xs text-gray-600 mb-2">{truncate(lead.medicalIssue, 40)}</div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted">{timeAgo(lead.createdAt)}</span>
                            {lead.approximateAmount && (
                                <span className="text-xs font-bold text-teal">{formatCurrency(lead.approximateAmount, lead.currency)}</span>
                            )}
                        </div>
                    </Link>
                ))}
                {leads.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted">No leads</div>
                )}
            </div>
        </div>
    );
}

function PipelineAccordion({ status, count }) {
    const [isOpen, setIsOpen] = React.useState(false);

    const { data: leadsRes } = useQuery({
        queryKey: ['leads', 'pipeline', status.value],
        queryFn: () => api.get('/leads', { params: { status: status.value, limit: 20 } }).then(r => r.data),
        enabled: isOpen,
    });

    const leads = leadsRes?.data || [];

    return (
        <div className="card overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left">
                <div className={`w-3 h-3 rounded-full ${status.dotClass}`} />
                <span className="text-sm font-bold flex-1">{status.label}</span>
                <span className="text-xs font-bold bg-gray-100 rounded-full px-2.5 py-1 text-muted">{count}</span>
            </button>

            {isOpen && (
                <div className="px-4 pb-4 space-y-2">
                    {leads.map(lead => (
                        <Link key={lead.id} to="/leads"
                            className="block p-3 bg-gray-50 rounded-xl border border-border">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm">{lead.name}</span>
                                <span className="text-[10px] text-muted">{timeAgo(lead.createdAt)}</span>
                            </div>
                            <div className="text-xs text-muted">{lead.medicalIssue ? truncate(lead.medicalIssue, 40) : lead.refId}</div>
                        </Link>
                    ))}
                    {leads.length === 0 && (
                        <div className="text-center py-4 text-sm text-muted">No leads in this stage</div>
                    )}
                </div>
            )}
        </div>
    );
}
