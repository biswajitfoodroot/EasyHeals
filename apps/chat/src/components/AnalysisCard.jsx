import React from 'react';
import { FileCheck, Pill, AlertTriangle, Activity } from 'lucide-react';

export default function AnalysisCard({ analysis }) {
    if (!analysis) return null;

    return (
        <div style={{
            background: 'linear-gradient(135deg, #EDFAF3, #F0F6FA)',
            border: '1.5px solid #A7F3D0',
            borderRadius: '12px',
            overflow: 'hidden',
            margin: '0 16px 12px',
            animation: 'msgIn 0.3s ease',
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(90deg, #22A45D, #1A8049)',
                padding: '11px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#fff',
            }}>
                <FileCheck size={16} />
                <span style={{ fontWeight: 700, fontSize: '13px' }}>🔬 Prescription Analysis (AI Summary)</span>
            </div>

            <div style={{ padding: '14px' }}>
                {/* Likely condition */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 0',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    fontSize: '12px',
                }}>
                    <span style={{ color: '#4A5568', fontWeight: 600 }}>Likely Diagnosis</span>
                    <span style={{ fontWeight: 700, color: '#22A45D' }}>{analysis.likely_condition}</span>
                </div>

                {/* Medications */}
                {analysis.medications?.map((m, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '5px 0',
                        borderBottom: i < analysis.medications.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                        fontSize: '12px',
                    }}>
                        <span style={{ color: '#4A5568' }}>{m.name}</span>
                        <span style={{ fontWeight: 600, color: '#1A1A2E', textAlign: 'right', maxWidth: '55%' }}>
                            {m.dosage}{m.duration ? ' • ' + m.duration : ''}
                        </span>
                    </div>
                ))}

                {/* Warnings */}
                {analysis.warnings?.length > 0 && (
                    <div style={{
                        background: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        borderRadius: '7px',
                        padding: '9px 11px',
                        fontSize: '11.5px',
                        color: '#92400E',
                        marginTop: '10px',
                        display: 'flex',
                        gap: '7px',
                        lineHeight: 1.5,
                    }}>
                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{analysis.warnings.join(' ')}</span>
                    </div>
                )}

                {/* Disclaimer */}
                <div style={{
                    fontSize: '10px',
                    color: '#94A3B8',
                    fontStyle: 'italic',
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #E2E9EF',
                    textAlign: 'center',
                }}>
                    {analysis.disclaimer}
                </div>
            </div>
        </div>
    );
}
