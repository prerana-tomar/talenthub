import React, { useState, useEffect } from 'react';
import API from '../config';
import './AppreciationBar.css';

const REACTION_CONFIG = [
  { type: 'applause',    emoji: '👏', label: 'Applause',    color: '#3b82f6' },
  { type: 'lovedIt',     emoji: '❤️', label: 'Loved It',     color: '#ec4899' },
  { type: 'outstanding', emoji: '🔥', label: 'Outstanding',  color: '#f97316' },
  { type: 'inspiring',   emoji: '🌟', label: 'Inspiring',    color: '#eab308' },
];

export default function AppreciationBar({
  targetId,
  type = 'video',
  initialAppreciations = {},
  initialUserReaction = null,
  onUnlockAchievement,
}) {
  const token = localStorage.getItem('th_token') || localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');

  const [counts, setCounts] = useState({
    applause: 0,
    lovedIt: 0,
    outstanding: 0,
    inspiring: 0,
  });

  const [activeReaction, setActiveReaction] = useState(initialUserReaction);
  const [animatingReaction, setAnimatingReaction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Parse initial appreciations
    if (initialAppreciations) {
      if (typeof initialAppreciations === 'object' && !Array.isArray(initialAppreciations)) {
        setCounts({
          applause:    initialAppreciations.applause    || 0,
          lovedIt:     initialAppreciations.lovedIt     || 0,
          outstanding: initialAppreciations.outstanding || 0,
          inspiring:   initialAppreciations.inspiring   || 0,
        });
      } else if (Array.isArray(initialAppreciations)) {
        setCounts(prev => ({ ...prev, lovedIt: initialAppreciations.length }));
      }
    }
  }, [initialAppreciations]);

  useEffect(() => {
    if (initialUserReaction) {
      setActiveReaction(initialUserReaction);
    } else if (user && initialAppreciations?.rawAppreciations) {
      const myId = (user._id || user.id)?.toString();
      const raw = initialAppreciations.rawAppreciations;
      for (const rType of ['applause', 'lovedIt', 'outstanding', 'inspiring']) {
        if (raw[rType]?.some(id => (id._id || id)?.toString() === myId)) {
          setActiveReaction(rType);
          break;
        }
      }
    }
  }, [initialUserReaction, initialAppreciations, user]);

  const handleReact = async (rType) => {
    if (!token) return alert('Login to appreciate this performance! ✨');
    if (loading) return;

    setLoading(true);
    setAnimatingReaction(rType);

    // Optimistic UI update
    const previousReaction = activeReaction;
    const isTogglingOff = previousReaction === rType;
    const newReaction = isTogglingOff ? null : rType;

    setActiveReaction(newReaction);
    setCounts(prev => {
      const updated = { ...prev };
      if (previousReaction) {
        updated[previousReaction] = Math.max(0, (updated[previousReaction] || 0) - 1);
      }
      if (newReaction) {
        updated[newReaction] = (updated[newReaction] || 0) + 1;
      }
      return updated;
    });

    try {
      const endpoint = type === 'thought'
        ? `${API}/api/thoughts/${targetId}/appreciate`
        : `${API}/api/videos/${targetId}/appreciate`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reactionType: rType })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.counts) setCounts(data.counts);
        setActiveReaction(data.userReaction);
        if (data.newlyUnlocked?.length > 0 && onUnlockAchievement) {
          onUnlockAchievement(data.newlyUnlocked);
        }
      }
    } catch {
      // Revert optimistic update on error
      setActiveReaction(previousReaction);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimatingReaction(null), 500);
    }
  };

  const totalAppreciations = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="appreciation-bar-wrap">
      <div className="appreciation-reactions-row">
        {REACTION_CONFIG.map(rc => {
          const isSelected = activeReaction === rc.type;
          const isAnimating = animatingReaction === rc.type;
          const count = counts[rc.type] || 0;

          return (
            <button
              key={rc.type}
              className={`appreciation-btn ${isSelected ? 'active' : ''} ${isAnimating ? 'pop' : ''}`}
              style={{ '--accent-color': rc.color }}
              onClick={(e) => { e.stopPropagation(); handleReact(rc.type); }}
              title={`${rc.label} (${count})`}
            >
              <span className="appreciation-emoji">{rc.emoji}</span>
              <span className="appreciation-count">{count > 0 ? count : ''}</span>
            </button>
          );
        })}
      </div>
      {totalAppreciations > 0 && (
        <span className="total-apprec-badge">
          {totalAppreciations} {totalAppreciations === 1 ? 'Appreciation' : 'Appreciations'}
        </span>
      )}
    </div>
  );
}
