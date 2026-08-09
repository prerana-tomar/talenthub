import React, { useState, useEffect } from 'react';
import API from '../config';
import './AppreciationBar.css';

const REACTION_CONFIG = [
  { type: 'applause',    emoji: '👏', label: 'Applause',    color: '#3b82f6' },
  { type: 'lovedIt',     emoji: '❤️', label: 'Loved It',    color: '#ec4899' },
  { type: 'outstanding', emoji: '🔥', label: 'Outstanding', color: '#f97316' },
  { type: 'inspiring',   emoji: '🌟', label: 'Inspiring',   color: '#eab308' },
];

export default function AppreciationBar({
  targetId,
  type = 'video',
  initialAppreciations = {},
  initialUserReaction = null,
  onUnlockAchievement,
  isCompact = false,
}) {
  const token = localStorage.getItem('th_token') || localStorage.getItem('token');
  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');
  const myId  = (user?._id || user?.id)?.toString();

  const [counts, setCounts]               = useState({ applause: 0, lovedIt: 0, outstanding: 0, inspiring: 0 });
  const [activeReaction, setActiveReaction] = useState(null);
  const [animating, setAnimating]           = useState(null);
  const [loading, setLoading]               = useState(false);

  // ── Parse initial appreciations + detect MY reaction ──
  useEffect(() => {
    if (!initialAppreciations) return;

    // Case 1: object with arrays of user IDs  { applause: [...], lovedIt: [...] }
    if (typeof initialAppreciations === 'object' && !Array.isArray(initialAppreciations)) {
      const newCounts = { applause: 0, lovedIt: 0, outstanding: 0, inspiring: 0 };
      let myReaction  = null;

      for (const rc of REACTION_CONFIG) {
        const arr = initialAppreciations[rc.type];
        if (Array.isArray(arr)) {
          newCounts[rc.type] = arr.length;
          // Check if current user is in this array
          if (myId && arr.some(id => (id?._id || id)?.toString() === myId)) {
            myReaction = rc.type;
          }
        } else if (typeof arr === 'number') {
          newCounts[rc.type] = arr;
        }
      }

      setCounts(newCounts);
      if (myReaction) setActiveReaction(myReaction);

    // Case 2: legacy — array of like IDs
    } else if (Array.isArray(initialAppreciations)) {
      const liked = initialAppreciations.some(id => (id?._id || id)?.toString() === myId);
      setCounts(prev => ({ ...prev, lovedIt: initialAppreciations.length }));
      if (liked) setActiveReaction('lovedIt');
    }
  }, [targetId]); // re-run only when video changes

  // Override if parent passes explicit userReaction
  useEffect(() => {
    if (initialUserReaction) setActiveReaction(initialUserReaction);
  }, [initialUserReaction]);

  const handleReact = async (rType) => {
    if (!token) { alert('Login karein to appreciate this performance! ✨'); return; }
    if (loading) return;

    setLoading(true);
    setAnimating(rType);

    // Optimistic update
    const prev       = activeReaction;
    const toggleOff  = prev === rType;
    const newReaction = toggleOff ? null : rType;

    setActiveReaction(newReaction);
    setCounts(c => {
      const updated = { ...c };
      if (prev)         updated[prev]  = Math.max(0, (updated[prev]  || 0) - 1);
      if (newReaction)  updated[newReaction] = (updated[newReaction] || 0) + 1;
      return updated;
    });

    try {
      const endpoint = type === 'thought'
        ? `${API}/api/thoughts/${targetId}/appreciate`
        : `${API}/api/videos/${targetId}/appreciate`;

      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ reactionType: rType }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.counts)       setCounts(data.counts);
        if ('userReaction' in data) setActiveReaction(data.userReaction);
        if (data.newlyUnlocked?.length > 0 && onUnlockAchievement) {
          onUnlockAchievement(data.newlyUnlocked);
        }
      } else {
        // Revert on error
        setActiveReaction(prev);
        setCounts(c => {
          const reverted = { ...c };
          if (newReaction) reverted[newReaction] = Math.max(0, (reverted[newReaction] || 0) - 1);
          if (prev)        reverted[prev]        = (reverted[prev] || 0) + 1;
          return reverted;
        });
      }
    } catch {
      // Revert on network error
      setActiveReaction(prev);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(null), 500);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className={`appreciation-bar-wrap ${isCompact ? 'compact' : ''}`}>
      <div className="appreciation-reactions-row">
        {REACTION_CONFIG.map(rc => {
          const isSelected  = activeReaction === rc.type;
          const isAnimating = animating === rc.type;
          const count       = counts[rc.type] || 0;

          return (
            <button
              key={rc.type}
              className={`appreciation-btn ${isSelected ? 'active' : ''} ${isAnimating ? 'pop' : ''}`}
              style={{ '--accent-color': rc.color }}
              onClick={e => { e.stopPropagation(); handleReact(rc.type); }}
              title={`${rc.label} (${count})`}
              disabled={loading}
            >
              <span className="appreciation-emoji">{rc.emoji}</span>
              <span className="appreciation-count">{count}</span>
            </button>
          );
        })}
      </div>

      {!isCompact && total > 0 && (
        <span className="total-apprec-badge">
          {total} {total === 1 ? 'Appreciation' : 'Appreciations'}
        </span>
      )}
    </div>
  );
}