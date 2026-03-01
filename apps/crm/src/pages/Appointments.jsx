import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Hospital, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://localhost:3000/v1';

export default function Appointments() {
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    // In a real app, we would have a GET /appointments endpoint
    // For now, we simulate by fetching leads with status 'scheduled'
    const { data: leads, isLoading } = useQuery({
        queryKey: ['leads-scheduled'],
        queryFn: () => axios.get(`${API_BASE}/leads?status=scheduled`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.data)
    });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({
        start: startOfWeek(monthStart),
        end: endOfWeek(monthEnd)
    });

    return (
        <div className="flex-1 overflow-y-auto bg-bg p-8">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Clinic Appointments</h1>
                    <p className="text-muted text-sm">Manage scheduled consultations and hospital visits</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar View */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-border shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</h2>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-gray-100 rounded-lg">Prev</button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-gray-100 rounded-lg">Next</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="bg-gray-50 p-2 text-center text-[10px] font-bold text-muted uppercase">{day}</div>
                        ))}
                        {calendarDays.map((day, idx) => {
                            const isSelected = isSameDay(day, new Date());
                            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                            return (
                                <div key={idx} className={`bg-white h-24 p-2 relative ${!isCurrentMonth ? 'opacity-30' : ''}`}>
                                    <span className={`text-xs font-bold ${isSelected ? 'bg-teal text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-500'}`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* List View */}
                <div className="space-y-6">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-muted">Upcoming Consultations</h3>
                    {isLoading ? (
                        <div className="p-10 text-center text-muted italic">Loading...</div>
                    ) : leads?.length === 0 ? (
                        <div className="p-10 bg-white rounded-2xl border border-dashed border-border text-center text-muted">
                            No appointments scheduled
                        </div>
                    ) : leads?.map(lead => (
                        <div key={lead.id} className="bg-white rounded-2xl p-4 border border-border hover:border-teal/30 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                                    <User size={18} />
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{lead.name}</div>
                                    <div className="text-[10px] text-muted font-mono">{lead.refId}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Clock size={14} className="text-muted" /> {lead.preferredCallTime || 'Time TBD'}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Hospital size={14} className="text-muted" /> {lead.city} Clinic
                                </div>
                            </div>

                            <button className="w-full mt-4 py-2 bg-gray-50 hover:bg-teal-pale hover:text-teal rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                                <CheckCircle2 size={14} /> Mark Completed
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
