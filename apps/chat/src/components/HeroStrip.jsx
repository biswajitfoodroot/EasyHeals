import React from 'react';
import { useChatStore } from '../store/chatStore';

export default function HeroStrip() {
    const { lang, getT } = useChatStore();
    const t = getT();

    return (
        <div style={{
            background: 'linear-gradient(110deg, #E84520 0%, #C73A1A 40%, #22A45D 100%)',
            padding: '28px 20px 22px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Radial glow overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,255,255,0.07), transparent)',
                pointerEvents: 'none',
            }} />

            <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                {/* Chip */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '100px', padding: '3px 12px',
                    fontSize: '11px', color: '#fff', marginBottom: '10px',
                }}>
                    <span className="pulse-dot" /> AI Health Assistant • Always Available
                </div>

                <h1
                    style={{ fontFamily: 'Lora, serif', fontSize: 'clamp(20px, 4vw, 26px)', color: '#fff', lineHeight: 1.3, marginBottom: '6px' }}
                    dangerouslySetInnerHTML={{ __html: t.heroTitle }}
                />
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.82)', maxWidth: '460px' }}>
                    {t.heroSub}
                </p>

                {/* Trust badges */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                    {[
                        { icon: '🏥', text: '500+ Hospitals' },
                        { icon: '👨‍⚕️', text: '2,000+ Doctors' },
                        { icon: '🌍', text: '6 Languages' },
                        { icon: '⚡', text: '2hr Callback' },
                    ].map((b) => (
                        <div key={b.text} style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            background: 'rgba(255,255,255,0.12)', borderRadius: '100px',
                            padding: '4px 11px', fontSize: '11px', color: 'rgba(255,255,255,0.9)',
                        }}>
                            {b.icon} {b.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
