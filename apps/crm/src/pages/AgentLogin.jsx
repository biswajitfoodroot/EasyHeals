import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../lib/utils';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function AgentLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please enter email and password');
            return;
        }
        setLoading(true);
        try {
            const data = await login(email, password);
            if (data.user.role !== 'agent') {
                toast.error('This login is for agents only. Please use the CRM login.');
                useAuth.getState().logout();
                return;
            }
            toast.success(`Welcome, ${data.user.name}!`);
            navigate('/agent/dashboard');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Login failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/20 mb-4">
                        <span className="text-3xl">🩺</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">EasyHeals <span className="text-teal-400">Agent Portal</span></h1>
                    <p className="text-slate-400 mt-2 text-sm">Login to manage your patient referrals</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-input"
                                placeholder="your@email.com"
                                autoFocus
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input pr-10"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-teal hover:bg-teal-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <LogIn size={18} />
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-slate-500 text-xs mt-6">
                    Contact your EasyHeals advisor to get your portal credentials.
                </p>
            </div>
        </div>
    );
}
