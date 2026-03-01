import React from 'react';
import './index.css';
import './App.css';
import Navbar from './components/Navbar';
import HeroStrip from './components/HeroStrip';
import ChatWindow from './components/ChatWindow';
import Sidebar from './components/Sidebar';

function App() {
  // ?embed=1  → hide nav, hero, sidebar — just the chat card (for iframe on Contact Us page)
  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get('embed') === '1' || params.get('embed') === 'true';

  if (isEmbed) {
    return (
      <div style={{
        height: '100vh', width: '100vw', background: '#fff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <ChatWindow />
      </div>
    );
  }


  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <HeroStrip />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 14px 80px' }}>
        {/* Responsive grid: 2 cols on ≥700px */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: '18px',
          alignItems: 'start',
        }}
          className="eh-page-grid"
        >
          <ChatWindow />
          <Sidebar />
        </div>
      </div>

      <style>{`
        @media (min-width: 700px) {
          .eh-page-grid {
            grid-template-columns: minmax(0, 1fr) 260px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
