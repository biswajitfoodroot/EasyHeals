import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { LEAD_STATUSES, PIPELINE_STATUSES, getStatusConfig } from '../lib/constants';
import { formatCurrency } from '../lib/utils';
import useAuth from '../hooks/useAuth';
import {
    Users, TrendingUp, Calendar, Phone, AlertTriangle,
    ArrowRight, BarChart3, UserPlus
} from 'lucide-react';

export default function Dashboard() {
    const { user } = useAuth();

    const { data: stats, isLoading } = useQuery({
        queryKey: ['lead-stats'],
        queryFn: () => api.get('/leads/stats').then(r => r.data),
    });

    const { data: recentLeads } = useQuery({
        queryKey: ['leads', { page: 1, limit: 5 }],
        queryFn: () => api.get('/leads', { params: { page: 1, limit: 5 } }).then(r => r.data),
    });

    const today = new Date().toISOString().split('T')[0];
    const statCards = [
        { label: 'Total Leads', value: stats?.totalLeads || 0, icon: Users, color: 'bg-blue-500', bgColor: 'bg-blue-50', link: '/leads' },
        { label: 'Today\'s Leads', value: stats?.todayLeads || 0, icon: UserPlus, color: 'bg-green-500', bgColor: 'bg-green-50', link: `/leads?dateFrom=${today}` },
        { label: 'Follow-ups Due', value: stats?.followUpsDue || 0, icon: AlertTriangle, color: 'bg-amber-500', bgColor: 'bg-amber-50', link: '/leads?followUpDue=true' },
        { label: 'Service Taken', value: stats?.byStatus?.service_taken || 0, icon: TrendingUp, color: 'bg-teal', bgColor: 'bg-teal-pale', link: '/leads?status=service_taken' },
    ];

    return (
        <div className="page-container pb-24 lg:pb-8">
            {/* Greeting */}
            <div className="mb-8">
                <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
                <p className="page-subtitle">Here's your CRM overview for today</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => (
                    <Link key={card.label} to={card.link} className="card p-4 sm:p-5 hover:shadow-md transition-shadow group block no-underline text-inherit">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <card.icon size={18} className={card.color.replace('bg-', 'text-')} />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold mb-1">
                            {isLoading ? <div className="skeleton h-8 w-16" /> : card.value}
                        </div>
                        <div className="text-xs font-medium text-muted">{card.label}</div>
                    </Link>
                ))}
            </div>

            {/* Pipeline Overview */}
            <div className="card mb-8">
                <div className="card-header flex items-center justify-between">
                    <h3 className="font-bold">Pipeline Overview</h3>
                    <Link to="/pipeline" className="text-sm text-teal font-semibold flex items-center gap-1 hover:underline">View <ArrowRight size={14} /></Link>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {LEAD_STATUSES.filter(s => PIPELINE_STATUSES.includes(s.value)).map(status => (
                            <Link key={status.value} to={`/leads?status=${status.value}`}
                                className="p-3 rounded-xl border border-border hover:shadow-sm transition-shadow text-center group">
                                <div className={`w-3 h-3 rounded-full ${status.dotClass} mx-auto mb-2`} />
                                <div className="text-lg font-bold">{stats?.byStatus?.[status.value] || 0}</div>
                                <div className="text-[10px] font-bold text-muted uppercase tracking-wider">{status.label}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Leads */}
            <div className="card">
                <div className="card-header flex items-center justify-between">
                    <h3 className="font-bold">Recent Leads</h3>
                    <Link to="/leads" className="text-sm text-teal font-semibold flex items-center gap-1 hover:underline">View All <ArrowRight size={14} /></Link>
                </div>
                <div className="divide-y divide-border">
                    {recentLeads?.data?.map(lead => {
                        const statusConfig = getStatusConfig(lead.status);
                        return (
                            <Link key={lead.id} to={`/leads`} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                <div className="w-10 h-10 bg-teal/10 text-teal rounded-xl flex items-center justify-center font-bold uppercase shrink-0">
                                    {lead.name?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{lead.name}</div>
                                    <div className="text-xs text-muted">{lead.medicalIssue ? lead.medicalIssue.slice(0, 40) : lead.departmentName || '—'}</div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${statusConfig.bgClass}`}>
                                    {statusConfig.label}
                                </span>
                            </Link>
                        );
                    })}
                    {(!recentLeads?.data || recentLeads.data.length === 0) && (
                        <div className="p-8 text-center text-muted text-sm">No leads yet. Create your first one!</div>
                    )}
                </div>
            </div>
        </div>
    );
}
