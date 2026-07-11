import React, { useState, useEffect } from 'react';
import API from '../config';
import './TopPerformers.css';

const TopPerformers = () => {
  const [performers, setPerformers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopPerformers();
  }, []);

  const fetchTopPerformers = async () => {
    try {
      const res = await fetch(`${API}/api/auth/top-performers`);
      const data = await res.json();
      // Support both array and { users: [] } response shapes
      setPerformers(Array.isArray(data) ? data.slice(0, 5) : (data.users || data.performers || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch top performers:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFollowers = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const rankColors = ['#f59e0b', '#94a3b8', '#cd7c2f', '#7c3aed', '#7c3aed'];

  if (loading) {
    return (
      <div className="top-performers-box">
        <div className="tp-header">
          <span>🏆</span>
          <h3>Top Performers</h3>
          <a href="/leaderboard" className="view-all-link">View All</a>
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="tp-skeleton" />
        ))}
      </div>
    );
  }

  if (performers.length === 0) {
    return (
      <div className="top-performers-box">
        <div className="tp-header">
          <span>🏆</span>
          <h3>Top Performers</h3>
        </div>
        <div className="tp-empty">
          <p>No performers yet. Be the first!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="top-performers-box">
      <div className="tp-header">
        <span>🏆</span>
        <h3>Top Performers</h3>
        <a href="/leaderboard" className="view-all-link">View All</a>
      </div>

      <div className="tp-list">
        {performers.map((user, index) => (
          <div
            key={user._id}
            className="tp-row"
            onClick={() => window.location.href = `/profile/${user._id}`}
          >
            <span
              className="tp-rank"
              style={{ color: rankColors[index] }}
            >
              {index + 1}
            </span>

            <div className="tp-avatar">
              {user.profilePic ? (
                <img
                  src={`${user.profilePic}`}
                  alt={user.username}
                />
              ) : (
                <span className="tp-avatar-letter">
                  {user.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="tp-info">
              <span className="tp-name">{user.username}</span>
              <span className="tp-followers">
                {formatFollowers(user.followers?.length || user.followerCount || 0)} Followers
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopPerformers;
