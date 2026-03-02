import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        '2xl': 'max-w-5xl',
        full: 'max-w-[95vw]',
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

            {/* Modal */}
            <div
                className={`relative bg-white w-full ${sizeClasses[size]} rounded-2xl shadow-2xl animate-scale-in max-h-[95vh] flex flex-col z-10 transition-all`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                        <h2 className="text-lg font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

