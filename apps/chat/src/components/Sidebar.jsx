import React from 'react';

export default function Sidebar() {
    return (
        <div style={{ display: 'grid', gap: '14px' }}>
            {/* How it works */}
            <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 2px 16px rgba(232,69,32,0.06)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💬 How this works
                </h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                        { n: 1, title: 'Chat naturally', desc: 'Describe symptoms in any language' },
                        { n: 2, title: 'Share your details', desc: 'We collect them right here in chat' },
                        { n: 3, title: 'Upload prescription', desc: 'AI reads & explains it instantly' },
                        { n: 4, title: 'Get specialist callback', desc: 'Our advisor calls within 2 hours' },
                    ].map((s) => (
                        <li key={s.n} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                            <div style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: '#E84520', color: '#fff',
                                fontSize: '10px', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, marginTop: '1px',
                            }}>{s.n}</div>
                            <div>
                                <strong style={{ display: 'block', fontSize: '12.5px', color: '#1A1A2E' }}>{s.title}</strong>
                                <span style={{ fontSize: '12px', color: '#4A5568', lineHeight: 1.5 }}>{s.desc}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Get the App */}
            <div style={{
                background: 'linear-gradient(135deg, #FEF0EC, #EDFAF3)',
                border: '1px solid #E2E9EF', borderRadius: '18px', padding: '16px',
                boxShadow: '0 2px 16px rgba(232,69,32,0.06)',
            }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📱 Get the App
                </h4>
                <p style={{ fontSize: '12px', color: '#4A5568', marginBottom: '10px' }}>
                    Book appointments, compare hospitals & track your health.
                </p>
                <a href="https://play.google.com/store/apps/details?id=com.Easyheals.patient"
                    target="_blank" rel="noreferrer"
                    style={{ display: 'block', background: '#22A45D', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textAlign: 'center', marginBottom: '6px' }}>
                    🟢 Google Play
                </a>
                <a href="https://apps.apple.com/in/app/easyheals/id6462711867"
                    target="_blank" rel="noreferrer"
                    style={{ display: 'block', background: '#1A1A2E', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                    🍎 App Store
                </a>
            </div>

            {/* Direct Support */}
            <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 2px 16px rgba(232,69,32,0.06)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📞 Direct Support
                </h4>
                <p style={{ fontSize: '12px', color: '#4A5568', marginBottom: '8px' }}>Prefer to speak directly?</p>
                <a href="tel:+917510818108" style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#EDFAF3', border: '1.5px solid #22A45D',
                    borderRadius: '8px', padding: '9px 12px',
                    fontSize: '13px', fontWeight: 700, color: '#22A45D', textDecoration: 'none',
                }}>
                    📞 +91-7510818108
                </a>
            </div>
        </div>
    );
}
