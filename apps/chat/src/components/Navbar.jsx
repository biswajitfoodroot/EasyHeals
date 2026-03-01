import React, { useRef } from 'react';
import { useChatStore } from '../store/chatStore';

const LANGS = [
    { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
    { code: 'hi', label: 'HI', flag: '🇮🇳', name: 'हिन्दी' },
    { code: 'mr', label: 'MR', flag: '🇮🇳', name: 'मराठी' },
    { code: 'bn', label: 'BN', flag: '🇧🇩', name: 'বাংলা' },
    { code: 'ta', label: 'TA', flag: '🇮🇳', name: 'தமிழ்' },
    { code: 'te', label: 'TE', flag: '🇮🇳', name: 'తెలుగు' },
];

export default function Navbar() {
    const { lang, setLang, resetChat, getT } = useChatStore();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const menuRef = useRef();

    const currentLang = LANGS.find(l => l.code === lang) || LANGS[0];

    const handleSetLang = (code) => {
        setLang(code);
        setMenuOpen(false);
        resetChat();
        // Re-trigger welcome after reset
        setTimeout(() => {
            const t = useChatStore.getState().getT();
            useChatStore.getState().addBotMessage(t.ask.welcome, t.ask.chips0, 600);
            useChatStore.getState().setProgress(5, 'Getting started...');
        }, 100);
    };

    React.useEffect(() => {
        const handler = () => setMenuOpen(false);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    return (
        <nav style={{
            background: '#fff',
            borderBottom: '1px solid #E2E9EF',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 16px rgba(232,69,32,0.06)',
        }}>
            {/* Logo */}
            <a href="https://easyheals.com" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
                <div style={{
                    width: 34, height: 34, borderRadius: '9px',
                    background: 'linear-gradient(135deg, #E84520, #22A45D)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '17px',
                }}>🩺</div>
                <span style={{ fontFamily: 'Lora, serif', fontSize: '19px', color: '#E84520', fontWeight: 600 }}>
                    Easy<strong style={{ color: '#22A45D' }}>Heals</strong>
                </span>
            </a>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <a href="https://easyheals.com" style={{
                    fontSize: '12px', color: '#94A3B8', textDecoration: 'none',
                    padding: '5px 12px', border: '1px solid #E2E9EF', borderRadius: '100px',
                }}>← Home</a>

                <div
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: '#FEF0EC', border: '1.5px solid #E2E9EF',
                        borderRadius: '100px', padding: '5px 12px',
                        fontSize: '12px', fontWeight: 700, color: '#E84520',
                        cursor: 'pointer', transition: 'all 0.2s',
                        userSelect: 'none',
                    }}
                >
                    🌐 {currentLang.label} ▾
                    {menuOpen && (
                        <div style={{
                            position: 'absolute', top: '110%', right: 0,
                            background: '#fff', border: '1px solid #E2E9EF',
                            borderRadius: '10px', boxShadow: '0 6px 32px rgba(0,0,0,0.10)',
                            minWidth: '170px', zIndex: 200, overflow: 'hidden',
                            animation: 'pop 0.15s ease',
                        }}
                            onClick={(e) => e.stopPropagation()}>
                            {LANGS.map(l => (
                                <div key={l.code}
                                    onClick={() => handleSetLang(l.code)}
                                    style={{
                                        padding: '9px 15px', fontSize: '13px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        transition: 'all 0.15s',
                                        background: lang === l.code ? '#E84520' : '#fff',
                                        color: lang === l.code ? '#fff' : '#1A1A2E',
                                    }}
                                    onMouseEnter={(e) => { if (lang !== l.code) e.currentTarget.style.background = '#FEF0EC'; }}
                                    onMouseLeave={(e) => { if (lang !== l.code) e.currentTarget.style.background = '#fff'; }}
                                >
                                    {l.flag} {l.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
