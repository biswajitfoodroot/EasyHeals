import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image, File, Eye } from 'lucide-react';

export default function FileUpload({ onUpload, accept = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx', maxSizeMB = 10, disabled = false }) {
    const inputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFiles = (files) => {
        const file = files[0];
        if (!file) return;

        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            alert(`File too large. Maximum size is ${maxSizeMB}MB.`);
            return;
        }

        onUpload(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    return (
        <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${dragActive ? 'border-teal bg-teal/5' : 'border-border hover:border-gray-300'
                } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragActive(false)}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
            />
            <Upload size={24} className="mx-auto text-muted mb-2" />
            <p className="text-sm font-medium text-text">
                Drop file here or <span className="text-teal">browse</span>
            </p>
            <p className="text-xs text-muted mt-1">
                PDF, Images, DOC — Max {maxSizeMB}MB
            </p>
        </div>
    );
}

// File preview item
export function FileItem({ name, type, size, onRemove, onView }) {
    const getIcon = () => {
        if (type?.includes('pdf')) return <FileText size={16} className="text-red-500" />;
        if (type?.includes('image')) return <Image size={16} className="text-blue-500" />;
        return <File size={16} className="text-gray-500" />;
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / 1048576).toFixed(1)}MB`;
    };

    return (
        <div className="flex items-center gap-3 p-3 group bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">

            <div className="p-3 flex items-center gap-3 flex-1 min-w-0">
                {getIcon()}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-[10px] text-muted">{formatSize(size)}</p>
                </div>
            </div>
            <div className="flex items-center gap-1 pr-2">
                {onView && (
                    <button
                        onClick={onView}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                        title="View File"
                    >
                        <Eye size={16} />
                    </button>
                )}
                {onRemove && (
                    <button
                        onClick={onRemove}
                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
                        title="Remove File"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

