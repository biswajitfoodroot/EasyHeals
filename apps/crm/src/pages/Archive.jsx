import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { timeAgo, truncate } from '../lib/utils';
import { Archive, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ArchivePage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [restoreId, setRestoreId] = useState(null);

    const { data: leadsRes, isLoading } = useQuery({
        queryKey: ['leads', 'archived', search],
        queryFn: () => api.get('/leads', { params: { isArchived: 'true', search: search || undefined, limit: 100 } }).then(r => r.data),
    });

    const leads = leadsRes?.data || [];

    const restoreMutation = useMutation({
        mutationFn: (id) => api.post(`/leads/${id}/restore`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success('Lead restored');
            setRestoreId(null);
        },
    });

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="mb-6">
                <h1 className="page-title">Archive</h1>
                <p className="page-subtitle">Archived leads can be restored at any time</p>
            </div>

            <div className="relative mb-4 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search archived leads..." className="form-input pl-10" />
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)
                ) : leads.length === 0 ? (
                    <div className="text-center py-12">
                        <Archive size={48} className="text-muted mx-auto mb-4" />
                        <p className="text-muted font-medium">No archived leads</p>
                    </div>
                ) : (
                    leads.map(lead => (
                        <div key={lead.id} className="card p-4 flex items-center gap-4 opacity-80 hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center font-bold uppercase">
                                {lead.name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{lead.name}</span>
                                    <StatusBadge status={lead.status} size="xs" />
                                </div>
                                <div className="text-xs text-muted">{lead.refId} · {lead.phone} · Archived {timeAgo(lead.archivedAt)}</div>
                            </div>
                            <button onClick={() => setRestoreId(lead.id)} className="btn-sm bg-teal/10 text-teal font-bold rounded-xl hover:bg-teal/20 transition-colors flex items-center gap-1.5 py-2 px-3">
                                <RefreshCw size={14} /> Restore
                            </button>
                        </div>
                    ))
                )}
            </div>

            <ConfirmDialog
                isOpen={!!restoreId}
                onClose={() => setRestoreId(null)}
                onConfirm={() => restoreMutation.mutate(restoreId)}
                title="Restore Lead"
                message="This lead will be moved back to active leads. Continue?"
                confirmLabel="Restore"
                confirmColor="teal"
                loading={restoreMutation.isPending}
            />
        </div>
    );
}
