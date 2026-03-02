import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmColor = 'red', loading = false }) {
    const colorClasses = {
        red: 'bg-red-600 hover:bg-red-700 text-white',
        teal: 'bg-teal hover:bg-teal-light text-white',
        amber: 'bg-amber-600 hover:bg-amber-700 text-white',
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
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
                </>
            }
        >
            <p className="text-sm text-muted">{message}</p>
        </Modal>
    );
}

