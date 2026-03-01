import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useChatFlow } from '../hooks/useChatFlow';
import { Send, Paperclip } from 'lucide-react';
import PrescriptionUpload from './PrescriptionUpload';
import AnalysisCard from './AnalysisCard';

function formatTime() {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

export default function ChatWindow() {
    const { messages, chips, isTyping, waitingFor, leadSaved, leadRef, rxAnalysis, rxZoneVisible, progress, progressLabel, lang, setLang, resetChat } = useChatStore();
    const { handleAction, analysePrescription } = useChatFlow();
    const [input, setInput] = useState('');
    const [inputError, setInputError] = useState('');
    const [showLangMenu, setShowLangMenu] = useState(false);
    const scrollRef = useRef();
    const footerFileRef = useRef();

    const LANGS = [
        { code: 'en', label: 'EN' },
        { code: 'hi', label: 'HI' },
        { code: 'mr', label: 'MR' },
        { code: 'bn', label: 'BN' },
        { code: 'ta', label: 'TA' },
        { code: 'te', label: 'TE' },
    ];

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, rxAnalysis, rxZoneVisible]);

    const onSend = () => {
        const val = input.trim();
        if (!val) return;
        setInputError('');
        handleAction(val);
        setInput('');
    };

    const handleFooterFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!leadSaved) {
            handleAction('I have a prescription to upload');
            return;
        }
        useChatStore.getState().addUserMessage('📎 Uploaded: ' + file.name);
        useChatStore.getState().setRxZoneVisible(false);
        analysePrescription(file);
    };

    const getProgressLabel = () => {
        if (progress >= 100) return '✓ Complete';
        return `${progress}%`;
    };

    return (
        <div style={{
            background: '#fff',
            borderRadius: '18px',
            boxShadow: '0 6px 32px rgba(0,0,0,0.10)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: '550px'
        }}>
            {/* Chat Header with Logo & Lang Dropdown */}
            <div style={{
                background: '#fff',
                borderBottom: '1px solid #E2E9EF',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 50,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: '8px',
                            background: 'linear-gradient(135deg, #E84520, #22A45D)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px', color: '#fff'
                        }}>🩺</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontFamily: 'Lora, serif', fontSize: '18px', fontWeight: 700, lineHeight: 1, color: '#E84520' }}>
                                Easy<span style={{ color: '#22A45D' }}>Heals</span>
                            </span>
                            <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>Health Assistant</span>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        style={{
                            padding: '6px 12px', borderRadius: '100px',
                            border: '1.5px solid #E2E9EF', background: '#F7F9FA',
                            fontSize: '12px', fontWeight: 700, color: '#E84520',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'all 0.2s'
                        }}>
                        🌐 {lang.toUpperCase()} ▾
                    </button>

                    {showLangMenu && (
                        <div style={{
                            position: 'absolute', top: '110%', right: 0,
                            background: '#fff', border: '1px solid #E2E9EF',
                            borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            minWidth: '110px', overflow: 'hidden'
                        }}>
                            {LANGS.map(l => (
                                <div key={l.code}
                                    onClick={() => { setLang(l.code); setShowLangMenu(false); resetChat(); }}
                                    style={{
                                        padding: '10px 14px', fontSize: '13px', cursor: 'pointer',
                                        background: lang === l.code ? '#FEF0EC' : '#fff',
                                        color: lang === l.code ? '#E84520' : '#1A1A2E',
                                        fontWeight: lang === l.code ? 700 : 400
                                    }}>
                                    {l.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: '3px', background: '#E2E9EF' }}>
                <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #E84520, #22A45D)',
                    transition: 'width 0.5s ease',
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 16px', fontSize: '10px', color: '#94A3B8' }}>
                <span>{progressLabel}</span>
                <span>{progress}%</span>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
                overflowY: 'auto', scrollBehavior: 'smooth',
            }}>
                {messages.map((m) => (
                    <div key={m.id} style={{ display: 'flex', gap: '8px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                        <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', flexShrink: 0,
                            background: m.role === 'user' ? '#FEF0EC' : '#F0F6FA',
                        }}>
                            {m.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div style={{ maxWidth: '82%' }}>
                            <div className={m.role === 'user' ? 'bubble-user' : 'bubble-bot'}
                                dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                            />
                            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px', padding: '0 4px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                                {m.time || formatTime()}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F0F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🤖</div>
                        <div style={{ background: '#F0F6FA', border: '1px solid #E2E9EF', borderRadius: '14px', borderBottomLeftRadius: '3px', padding: '10px 14px', display: 'flex', gap: '4px' }}>
                            <div className="td" /><div className="td" /><div className="td" />
                        </div>
                    </div>
                )}

                {rxZoneVisible && (
                    <PrescriptionUpload onUpload={(file) => {
                        useChatStore.getState().addUserMessage('📎 Attached: ' + file.name);
                        useChatStore.getState().setRxZoneVisible(false);
                        analysePrescription(file);
                    }} />
                )}

                {rxAnalysis && <AnalysisCard analysis={rxAnalysis} />}

                <div ref={scrollRef} />
            </div>

            {/* Chips */}
            {chips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 16px' }}>
                    {chips.map((ch) => (
                        <button key={ch} className="chip" onClick={() => handleAction(ch)}>
                            {ch}
                        </button>
                    ))}
                </div>
            )}

            {/* Consent Banner (Visible just before final save) */}
            {waitingFor === 'location' && (
                <div style={{
                    padding: '8px 16px', background: '#FEF3F2', borderTop: '1px solid #FEE4E2',
                    display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px', color: '#B42318'
                }}>
                    <input
                        type="checkbox"
                        id="consent-check"
                        defaultChecked={true}
                        style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <label htmlFor="consent-check" style={{ cursor: 'pointer', lineHeight: '1.4' }}>
                        I agree EasyHeals can contact me and share my details with relevant hospitals/doctors to help with my request.
                    </label>
                </div>
            )}

            {/* Footer input */}
            <div style={{ borderTop: '1px solid #E2E9EF', padding: '12px 14px', background: '#F7F9FA' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <label style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: '#FEF0EC', border: '1.5px solid #FDBA74',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                    }}>
                        <Paperclip size={18} color="#E84520" />
                        <input ref={footerFileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFooterFile} />
                    </label>
                    <textarea
                        style={{
                            flex: 1, padding: '10px 14px',
                            border: '1.5px solid #E2E9EF', borderRadius: '14px',
                            fontFamily: 'inherit', fontSize: '14px',
                            background: '#fff', outline: 'none', resize: 'none', maxHeight: '100px',
                        }}
                        rows={1}
                        placeholder={waitingFor ? "Type here..." : "Ask Arya anything..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                    />
                    <button onClick={onSend} style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: '#E84520', border: 'none', color: '#fff',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
