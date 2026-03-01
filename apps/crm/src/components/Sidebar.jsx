import React, { useState } from 'react';
import {
    BarChart3, Users, LayoutGrid, MessageSquare,
    Settings, LogOut, UserCog, Building2, FileText,
    Archive, ClipboardList, TrendingUp, Menu, X,
    Plus, MoreHorizontal, Briefcase, Search
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const mainNavItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Leads', path: '/leads' },
    { icon: LayoutGrid, label: 'Pipeline', path: '/pipeline' },
    { icon: MessageSquare, label: 'WhatsApp', path: '/whatsapp' },
];

const moreNavItems = [
    { icon: Briefcase, label: 'Agents', path: '/agents' },
    { icon: Building2, label: 'Master Data', path: '/masters' },
    { icon: FileText, label: 'Invoices', path: '/invoices' },
    { icon: Archive, label: 'Archive', path: '/archive' },
    { icon: TrendingUp, label: 'Reports', path: '/reports' },
];

const adminNavItems = [
    { icon: UserCog, label: 'Users', path: '/users' },
];

export default function Sidebar() {
    const { user, logout, isAdmin } = useAuth();
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
    const navigate = useNavigate();

    const allNavItems = [...mainNavItems, ...moreNavItems, ...(isAdmin ? adminNavItems : [])];

    return (
        <>
            {/* ─── Desktop Sidebar ─── */}
            <div className="hidden lg:flex w-64 bg-sidebar h-screen flex-col p-4 border-r border-white/10 shrink-0">
                {/* Logo */}
                <div className="flex items-center gap-3 px-3 py-6 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center text-lg">🩺</div>
                    <div className="text-white font-bold tracking-tight">EasyHeals <span className="text-teal-light">CRM</span></div>
                </div>

                {/* Search */}
                <div className="px-2 mb-4">
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 text-muted text-sm cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => navigate('/leads')}>
                        <Search size={16} />
                        <span>Search leads...</span>
                        <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</span>
                    </div>
                </div>

                {/* Main Nav */}
                <div className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar">
                    <div className="px-3 py-2 text-[10px] font-bold text-muted/60 uppercase tracking-widest">Main</div>
                    {mainNavItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.path}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <item.icon size={18} />
                            <span className="text-sm">{item.label}</span>
                        </NavLink>
                    ))}

                    <div className="px-3 py-2 mt-4 text-[10px] font-bold text-muted/60 uppercase tracking-widest">Manage</div>
                    {moreNavItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.path}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <item.icon size={18} />
                            <span className="text-sm">{item.label}</span>
                        </NavLink>
                    ))}

                    {isAdmin && (
                        <>
                            <div className="px-3 py-2 mt-4 text-[10px] font-bold text-muted/60 uppercase tracking-widest">Admin</div>
                            {adminNavItems.map((item) => (
                                <NavLink
                                    key={item.label}
                                    to={item.path}
                                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                >
                                    <item.icon size={18} />
                                    <span className="text-sm">{item.label}</span>
                                </NavLink>
                            ))}
                        </>
                    )}
                </div>

                {/* User / Logout */}
                <div className="pt-4 border-t border-white/10 space-y-1">
                    <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <Settings size={18} />
                        <span className="text-sm">Settings</span>
                    </NavLink>
                    <div className="sidebar-link" onClick={logout}>
                        <LogOut size={18} />
                        <span className="text-sm">Logout</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 mt-2">
                        <div className="w-8 h-8 rounded-full bg-teal/20 text-teal flex items-center justify-center text-xs font-bold">
                            {user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-semibold truncate">{user?.name}</div>
                            <div className="text-muted text-[10px] truncate">{user?.role}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Mobile Bottom Nav ─── */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40 safe-area-bottom">
                <div className="flex items-center justify-around">
                    {mainNavItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.path}
                            className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}

                    {/* More button */}
                    <button
                        onClick={() => setMobileMoreOpen(true)}
                        className="bottom-nav-link"
                    >
                        <Menu size={20} />
                        <span>More</span>
                    </button>
                </div>
            </div>

            {/* ─── Mobile More Sheet ─── */}
            {mobileMoreOpen && (
                <div className="lg:hidden fixed inset-0 z-50" onClick={() => setMobileMoreOpen(false)}>
                    <div className="fixed inset-0 bg-black/40 animate-fade-in" />
                    <div
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-slide-up z-10 max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h3 className="font-bold text-lg">Menu</h3>
                            <button onClick={() => setMobileMoreOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        {/* User info */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-gray-50">
                            <div className="w-10 h-10 rounded-full bg-teal/20 text-teal flex items-center justify-center text-sm font-bold">
                                {user?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <div className="font-semibold">{user?.name}</div>
                                <div className="text-xs text-muted capitalize">{user?.role}</div>
                            </div>
                        </div>

                        <div className="py-2">
                            {allNavItems.map((item) => (
                                <NavLink
                                    key={item.label}
                                    to={item.path}
                                    onClick={() => setMobileMoreOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors ${isActive ? 'text-teal bg-teal/5' : 'text-text hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </NavLink>
                            ))}

                            <NavLink
                                to="/settings"
                                onClick={() => setMobileMoreOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors ${isActive ? 'text-teal bg-teal/5' : 'text-text hover:bg-gray-50'
                                    }`
                                }
                            >
                                <Settings size={18} /> Settings
                            </NavLink>

                            <button
                                onClick={() => { setMobileMoreOpen(false); logout(); }}
                                className="w-full flex items-center gap-3 px-6 py-3.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <LogOut size={18} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Mobile FAB (Add Lead) ─── */}
            <NavLink
                to="/leads?new=1"
                className="lg:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-teal rounded-full shadow-lg shadow-teal/30 flex items-center justify-center text-white hover:bg-teal-light transition-all active:scale-95"
            >
                <Plus size={24} />
            </NavLink>
        </>
    );
}
