import React, { useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { useChatStore } from '../store/chatStore';

export default function PrescriptionUpload({ onUpload }) {
    const fileRef = useRef();
    const { rxZoneVisible, rxAnalysis } = useChatStore();
    const [file, setFile] = React.useState(null);

    if (!rxZoneVisible && !file) return null;

    const handleFile = (f) => {
        if (!f) return;
        setFile(f);
        useChatStore.getState().setRxZoneVisible(false);
        onUpload && onUpload(f);
    };

    const removeFile = () => {
        setFile(null);
        useChatStore.getState().setRxZoneVisible(true);
        if (fileRef.current) fileRef.current.value = '';
    };

    return (
        <div style={{ margin: '0 16px 12px' }}>
            {/* Upload zone */}
            {rxZoneVisible && !file && (
                <label
                    htmlFor="rx-file-input"
                    style={{
                        display: 'block',
                        border: '2px dashed #E2E9EF',
                        borderRadius: '10px',
                        padding: '20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: '#F0F6FA',
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#22A45D'; e.currentTarget.style.background = '#EDFAF3'; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = '#E2E9EF'; e.currentTarget.style.background = '#F0F6FA'; }}
                    onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                >
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>📋</div>
                    <div style={{ fontWeight: 700, color: '#E84520', fontSize: '13px' }}>Upload Your Prescription</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>JPG, PNG or PDF • Max 10MB</div>
                    <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#E84520', color: '#fff', padding: '7px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>
                        <Upload size={12} /> Choose File
                    </div>
                    <input
                        ref={fileRef}
                        id="rx-file-input"
                        type="file"
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                </label>
            )}

            {/* File preview */}
            {file && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#FEF0EC',
                    border: '1.5px solid #FDBA74',
                    borderRadius: '10px',
                    padding: '10px 13px',
                    animation: 'msgIn 0.2s ease',
                }}>
                    <FileText size={20} color="#E84520" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1A1A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                    </span>
                    <button
                        onClick={removeFile}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '15px', padding: '2px' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
