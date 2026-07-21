import React, { useEffect } from 'react';
import './AchievementPopup.css';

export default function AchievementPopup({ achievements = [], onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [achievements, onClose]);

  if (!achievements || achievements.length === 0) return null;

  const current = achievements[0];

  return (
    <div className="achievement-popup-overlay" onClick={onClose}>
      <div className="achievement-popup-card" onClick={e => e.stopPropagation()}>
        <div className="achievement-popup-confetti">🎉 🌟 ✨ 🏆</div>

        <div className="achievement-popup-header">
          <span className="achievement-popup-badge">BADGE UNLOCKED!</span>
          <button className="achievement-popup-close" onClick={onClose}>✕</button>
        </div>

        <div className="achievement-popup-body">
          <div className="achievement-popup-icon">{current.icon}</div>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
        </div>

        <button className="achievement-popup-claim-btn" onClick={onClose}>
          Awesome! 🚀
        </button>
      </div>
    </div>
  );
}
