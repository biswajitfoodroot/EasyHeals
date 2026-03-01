import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Login() {
    const { token, login, setup } = useAuth();
    const [isSetup, setIsSetup] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);

    if (token) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isSetup) {
                await setup(form.name, form.email, form.password);
                toast.success('Owner account created!');
            } else {
                await login(form.email, form.password);
                toast.success('Welcome back!');
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed';
            toast.error(msg);
            // If setup already completed, switch to login mode
            if (msg === 'Setup already completed. Use login instead.') setIsSetup(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-teal rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-teal/20">🩺</div>
                    </div>
                    <h1 className="text-2xl font-bold">EasyHeals <span className="text-teal">CRM</span></h1>
                    <p className="text-muted text-sm mt-1">Medical Tourism Management</p>
                </div>

                {/* Card */}
                <div className="card p-6 sm:p-8">
                    <h2 className="text-lg font-bold mb-1">
                        {isSetup ? 'Initial Setup' : 'Sign In'}
                    </h2>
                    <p className="text-sm text-muted mb-6">
                        {isSetup ? 'Create the owner account for your CRM' : 'Enter your credentials to continue'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSetup && (
                            <div>
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="form-input"
                                    placeholder="Your name"
                                    required
                                />
                            </div>
                        )}
                        <div>
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                className="form-input"
                                placeholder="you@company.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                                className="form-input"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
                            {loading ? 'Please wait...' : isSetup ? 'Create Owner Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            onClick={() => setIsSetup(!isSetup)}
                            className="text-sm text-teal font-semibold hover:underline"
                        >
                            {isSetup ? 'Already have an account? Sign In' : 'First time? Set Up Owner Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
