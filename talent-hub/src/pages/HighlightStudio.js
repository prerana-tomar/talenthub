import React from 'react';
import './HighlightStudio.css';

const HighlightStudio = () => {
  return (
    <div className="hs-page" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh', textAlign:'center' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🎬</div>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
        ✦ AI Highlight Studio
      </h1>
      <p style={{ fontSize: 16, color: '#8b859e', marginBottom: 8 }}>
        Yeh feature jald aane wala hai!
      </p>
      <p style={{ fontSize: 14, color: '#6b6380' }}>
        Upload karo, AI automatically best moments dhundh ke reels banayega 🚀
      </p>
      <div style={{
        marginTop: 28,
        padding: '10px 28px',
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        borderRadius: 10,
        color: 'white',
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 1,
      }}>
        🔔 Coming Soon
      </div>
    </div>
  );
};

export default HighlightStudio;