import React from 'react';
import { X } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmColor = 'red', loading = false }) {
    if (!isOpen) return null;

    const colorClasses = {
        red: 'bg-red-600 hover:bg-red-700 text-white',
        teal: 'bg-teal hover:bg-teal-light text-white',
        amber: 'bg-amber-600 hover:bg-amber-700 text-white',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

            <div
                className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up sm:animate-scale-in z-10 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted mb-6">{message}</p>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-colors shadow-sm ${colorClasses[confirmColor]} disabled:opacity-50`}
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
