import React from 'react';
import './AchievementCard.css';

export default function AchievementCard({ achievement }) {
  if (!achievement) return null;

  const { title, icon, description, unlocked, unlockedAt } = achievement;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
      <div className="achievement-icon-wrap">
        <span className="achievement-icon">{icon}</span>
        {!unlocked && <span className="achievement-lock-badge">🔒</span>}
      </div>

      <div className="achievement-details">
        <h4 className="achievement-title">{title}</h4>
        <p className="achievement-desc">{description}</p>

        {unlocked && unlockedAt ? (
          <span className="achievement-unlocked-date">Unlocked {formatDate(unlockedAt)}</span>
        ) : (
          <span className="achievement-locked-status">Locked</span>
        )}
      </div>
    </div>
  );
}
