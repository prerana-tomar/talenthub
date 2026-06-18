import React, { useState, useEffect } from 'react';
import './Categories.css';

const CATEGORY_META = {
  Music: { icon: '🎵', color: '#7c3aed', desc: 'Songs, covers, and original compositions' },
  Dance: { icon: '💃', color: '#ec4899', desc: 'Classical, contemporary, and freestyle moves' },
  Comedy: { icon: '😂', color: '#f59e0b', desc: 'Stand-up, skits, and funny performances' },
  Poetry: { icon: '📝', color: '#06b6d4', desc: 'Spoken word, shayari, and literary art' },
  Art: { icon: '🎨', color: '#10b981', desc: 'Visual art, sketching, and creative work' },
  Other: { icon: '✨', color: '#8b5cf6', desc: 'Unique talents that defy categories' },
};

const Categories = () => {
  const [selected, setSelected] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  useEffect(() => {
    if (selected) fetchVideosByCategory(selected);
  }, [selected]);

  const fetchCategoryStats = async () => {
    try {
      const res = await fetch('https://talenthub-w1cc.onrender.com/api/videos/category-stats');
      const data = await res.json();
      // Expect: { Music: 12, Dance: 8, ... }
      setStats(data || {});
    } catch {
      // If endpoint doesn't exist, silently fail
    }
  };

  const fetchVideosByCategory = async (cat) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/videos?category=${cat}`);
      const data = await res.json();
      setVideos(data.videos || data || []);
    } catch (err) {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const formatViews = (n) => {
    if (!n) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (selected) {
    const meta = CATEGORY_META[selected];
    return (
      <div className="categories-page">
        <button className="back-btn" onClick={() => { setSelected(null); setVideos([]); }}>
          ← Back to Categories
        </button>

        <div className="category-header" style={{ borderColor: meta.color }}>
          <span className="cat-icon-large">{meta.icon}</span>
          <div>
            <h1 style={{ color: meta.color }}>{selected}</h1>
            <p>{meta.desc}</p>
          </div>
        </div>

        {loading ? (
          <div className="video-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="video-skeleton" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="cat-empty">
            <span style={{ fontSize: '3rem' }}>{meta.icon}</span>
            <h3>No videos yet in {selected}</h3>
            <p>Be the first to upload in this category!</p>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map((video) => (
              <div
                key={video._id}
                className="video-card-cat"
                onClick={() => window.location.href = `/video/${video._id}`}
              >
                <div className="video-thumb">
                  <video src={`${video.videoUrl}`} muted />
                  <div className="video-overlay">
                    <span className="play-icon">▶</span>
                  </div>
                  <span className="view-count">👁 {formatViews(video.views)}</span>
                </div>
                <div className="video-info-cat">
                  <p className="video-title-cat">{video.title}</p>
                  <span className="video-uploader">@{video.uploader?.username || 'unknown'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="categories-page">
      <div className="categories-header">
        <h1>🎭 Explore Categories</h1>
        <p>Discover performances across every art form</p>
      </div>

      <div className="categories-grid">
        {Object.entries(CATEGORY_META).map(([name, meta]) => (
          <div
            key={name}
            className="category-card"
            style={{ '--cat-color': meta.color }}
            onClick={() => setSelected(name)}
          >
            <div className="cat-glow" />
            <div className="cat-icon">{meta.icon}</div>
            <h2 className="cat-name">{name}</h2>
            <p className="cat-desc">{meta.desc}</p>
            <div className="cat-footer">
              <span className="cat-count">{stats[name] ?? '–'} videos</span>
              <span className="cat-arrow">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;
