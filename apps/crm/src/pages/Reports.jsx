import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { LEAD_STATUSES, getStatusConfig } from '../lib/constants';
import { formatCurrency } from '../lib/utils';
import { BarChart3, TrendingUp, Users, DollarSign, PieChart } from 'lucide-react';

export default function Reports() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['lead-stats'],
        queryFn: () => api.get('/leads/stats').then(r => r.data),
    });

    const byStatus = stats?.byStatus || {};
    const totalLeads = stats?.totalLeads || 0;

    // Calculate conversion funnel
    const funnel = LEAD_STATUSES.filter(s => !['junk', 'lost'].includes(s.value)).map(status => ({
        ...status,
        count: byStatus[status.value] || 0,
        percentage: totalLeads > 0 ? Math.round(((byStatus[status.value] || 0) / totalLeads) * 100) : 0,
    }));

    const conversionRate = totalLeads > 0 ? Math.round(((byStatus['converted'] || 0) / totalLeads) * 100) : 0;
    const lostRate = totalLeads > 0 ? Math.round(((byStatus['lost'] || 0) / totalLeads) * 100) : 0;

    return (
        <div className="page-container pb-24 lg:pb-8">
            <div className="mb-6">
                <h1 className="page-title">Reports</h1>
                <p className="page-subtitle">Analytics and performance metrics</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard icon={Users} label="Total Leads" value={totalLeads} color="blue" loading={isLoading} />
                <MetricCard icon={TrendingUp} label="Conversion Rate" value={`${conversionRate}%`} color="green" loading={isLoading} />
                <MetricCard icon={PieChart} label="Lost Rate" value={`${lostRate}%`} color="red" loading={isLoading} />
                <MetricCard icon={BarChart3} label="Today's Leads" value={stats?.todayLeads || 0} color="amber" loading={isLoading} />
            </div>

            {/* Conversion Funnel */}
            <div className="card mb-8">
                <div className="card-header">
                    <h3 className="font-bold">Conversion Funnel</h3>
                </div>
                <div className="card-body space-y-3">
                    {funnel.map((stage) => (
                        <div key={stage.value} className="flex items-center gap-4">
                            <span className="w-40 text-sm font-medium truncate">{stage.label}</span>
                            <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${stage.dotClass} transition-all duration-700`}
                                    style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                                />
                            </div>
                            <span className="w-12 text-sm font-bold text-right">{stage.count}</span>
                            <span className="w-12 text-xs text-muted text-right">{stage.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Status Distribution */}
            <div className="card mb-8">
                <div className="card-header">
                    <h3 className="font-bold">Status Distribution</h3>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {LEAD_STATUSES.map(status => {
                            const count = byStatus[status.value] || 0;
                            const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                            return (
                                <div key={status.value} className="text-center p-3 rounded-xl border border-border">
                                    <div className={`w-4 h-4 rounded-full ${status.dotClass} mx-auto mb-2`} />
                                    <div className="text-xl font-bold">{count}</div>
                                    <div className="text-[10px] font-bold text-muted uppercase">{status.label}</div>
                                    <div className="text-[10px] text-muted">{pct}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Quick Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                    <div className="card-header"><h3 className="font-bold">Pipeline Health</h3></div>
                    <div className="card-body space-y-4">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Active Pipeline</span>
                            <span className="font-bold">{totalLeads - (byStatus['junk'] || 0) - (byStatus['lost'] || 0) - (byStatus['converted'] || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Follow-ups Due</span>
                            <span className="font-bold text-amber-600">{stats?.followUpsDue || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted">Junk / Lost</span>
                            <span className="font-bold text-red-500">{(byStatus['junk'] || 0) + (byStatus['lost'] || 0)}</span>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header"><h3 className="font-bold">Quick Actions</h3></div>
                    <div className="card-body space-y-3">
                        <a href="/leads?status=new" className="block p-3 bg-blue-50 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                            📥 New leads requiring attention: <strong>{byStatus['new'] || 0}</strong>
                        </a>
                        <a href="/leads?status=prospect" className="block p-3 bg-amber-50 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                            🔥 Hot prospects: <strong>{byStatus['prospect'] || 0}</strong>
                        </a>
                        <a href="/leads?status=appointment_booked" className="block p-3 bg-purple-50 rounded-xl text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors">
                            📅 Appointments booked: <strong>{byStatus['appointment_booked'] || 0}</strong>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, color, loading }) {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        red: 'bg-red-50 text-red-600',
        amber: 'bg-amber-50 text-amber-600',
    };

    return (
        <div className="card p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mb-3`}>
                <Icon size={18} />
            </div>
            <div className="text-2xl font-bold mb-1">
                {loading ? <div className="skeleton h-7 w-12" /> : value}
            </div>
            <div className="text-xs font-medium text-muted">{label}</div>
        </div>
    );
}
