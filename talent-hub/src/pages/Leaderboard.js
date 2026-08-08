import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import API from '../config';
import './Leaderboard.css';

const Leaderboard = () => {
  const [performers, setPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchLeaderboard();
  }, [period, category]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('th_token') || localStorage.getItem('token');
      const res = await fetch(
        `${API}/api/users/leaderboard?period=${period}&category=${category}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setPerformers(data.leaderboard || data || []);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setPerformers([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return 'rank-default';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={14} color="#f59e0b" />;
    if (rank === 2) return <Trophy size={14} color="#94a3b8" />;
    if (rank === 3) return <Trophy size={14} color="#cd7c2f" />;
    return `#${rank}`;
  };

  const formatFollowers = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const categories = ['all', 'Music', 'Dance', 'Comedy', 'Poetry', 'Art', 'Other'];
  const periods = [
    { value: 'all', label: 'All Time' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  return (
    <div className="leaderboard-page">
      {/* Premium Hero Section */}
      <div className="th-page-hero">
        <div className="th-page-hero-text">
          <h1 className="th-page-hero-title">LEADERBOARD <span>RANKINGS</span></h1>
          <p className="th-page-hero-subtitle">Top performing creators and rising stars on TalentHub. Compete to claim the podium!</p>
          
          {/* Filters inside/below the text area of Hero */}
          <div className="leaderboard-filters" style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="filter-group" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '30px', border: '1px solid var(--border)' }}>
              {periods.map((p) => (
                <button
                  key={p.value}
                  className={period === p.value ? 'fbActive' : 'fb'}
                  style={{ padding: '6px 14px !important', border: 'none !important', background: 'transparent' }}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <select
              className="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '30px', color: 'var(--text-primary)', outline: 'none' }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="th-page-hero-img-wrap" style={{ background: 'rgba(245, 166, 35, 0.1)', color: '#f5a623', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={40} />
        </div>
      </div>

      {loading ? (
        <div className="leaderboard-loading">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      ) : performers.length === 0 ? (
        <div className="th-empty-state-illustrated">
          <div className="th-empty-state-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#8B5CF6' }}>
            <Trophy size={32} />
          </div>
          <h3>No performers found</h3>
          <p>Nobody has claimed the leaderboard ranks yet for this selection. Be the first creator to upload and rule the stage!</p>
          <button className="th-empty-state-cta-btn" onClick={() => window.location.href = '/explore'}>
            Find Performers
          </button>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {performers.length >= 3 && (
            <div className="podium-section">
              {/* 2nd place */}
              <div className="podium-card podium-second">
                <div className="podium-avatar silver">
                  {performers[1]?.profilePic ? (
                    <img src={`${performers[1].profilePic}`} alt={performers[1]?.username} />
                  ) : (
                    <span>{performers[1]?.username?.[0]?.toUpperCase()}</span>
                  )}
                  <div className="podium-rank-badge rank-silver">🥈</div>
                </div>
                <p className="podium-name">{performers[1]?.username}</p>
                <p className="podium-followers">{formatFollowers(performers[1]?.followers?.length)} followers</p>
                <div className="podium-bar second-bar" />
              </div>

              {/* 1st place */}
              <div className="podium-card podium-first">
                <div className="podium-crown">👑</div>
                <div className="podium-avatar gold large">
                  {performers[0]?.profilePic ? (
                    <img src={`${performers[0].profilePic}`} alt={performers[0]?.username} />
                  ) : (
                    <span>{performers[0]?.username?.[0]?.toUpperCase()}</span>
                  )}
                  <div className="podium-rank-badge rank-gold">🥇</div>
                </div>
                <p className="podium-name">{performers[0]?.username}</p>
                <p className="podium-followers">{formatFollowers(performers[0]?.followers?.length)} followers</p>
                <div className="podium-bar first-bar" />
              </div>

              {/* 3rd place */}
              <div className="podium-card podium-third">
                <div className="podium-avatar bronze">
                  {performers[2]?.profilePic ? (
                    <img src={`${performers[2].profilePic}`} alt={performers[2]?.username} />
                  ) : (
                    <span>{performers[2]?.username?.[0]?.toUpperCase()}</span>
                  )}
                  <div className="podium-rank-badge rank-bronze">🥉</div>
                </div>
                <p className="podium-name">{performers[2]?.username}</p>
                <p className="podium-followers">{formatFollowers(performers[2]?.followers?.length)} followers</p>
                <div className="podium-bar third-bar" />
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="leaderboard-list">
            {performers.map((performer, index) => (
              <div
                key={performer._id}
                className={`leaderboard-row th-premium-card-redesign ${index < 3 ? 'top-three' : ''}`}
                style={{
                  borderLeft: index < 3 ? `4px solid ${index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : '#cd7c2f'}` : 'none'
                }}
              >
                <div className={`rank-badge ${getRankStyle(index + 1)}`}>
                  {getRankIcon(index + 1)}
                </div>

                <div className="performer-info">
                  <div className="performer-avatar">
                    {performer.profilePic ? (
                      <img
                        src={`${performer.profilePic}`}
                        alt={performer.username}
                      />
                    ) : (
                      <span>{performer.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="performer-details">
                    <span className="performer-name">{performer.username}</span>
                    <span className="performer-bio">{performer.bio || 'Talent performer'}</span>
                  </div>
                </div>

                <div className="performer-stats">
                  <div className="stat">
                    <span className="stat-value">{formatFollowers(performer.followers?.length)}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{performer.videoCount || 0}</span>
                    <span className="stat-label">Videos</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatFollowers(performer.totalViews || 0)}</span>
                    <span className="stat-label">Views</span>
                  </div>
                </div>

                <button
                  className="view-profile-btn"
                  onClick={() => window.location.href = `/profile/${performer._id}`}
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
