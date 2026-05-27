import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyUploads.css';

export default function MyUploads() {
  const [videos, setVideos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter]       = useState('All');

  const navigate = useNavigate();
  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');
  const token = localStorage.getItem('th_token') || localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchMyVideos();
  }, []);

  const fetchMyVideos = async () => {
    setLoading(true);
    try {
      const res  = await fetch('https://talenthub-w1cc.onrender.com/api/videos/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : (data.videos || []));
    } catch { setVideos([]); }
    finally  { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this video?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`https://talenthub-w1cc.onrender.com/api/videos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setVideos(prev => prev.filter(v => v._id !== id));
      else alert('Failed to delete');
    } catch { alert('Network error'); }
    setDeletingId(null);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const formatViews = (n) => {
    if (!n) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const categories = ['All', ...new Set(videos.map(v => v.category).filter(Boolean))];
  const filtered   = filter === 'All' ? videos : videos.filter(v => v.category === filter);

  const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes = videos.reduce((s, v) => s + (v.likes?.length || 0), 0);

  return (
    <div className="mu-page">

      {/* Header */}
      <div className="mu-header">
        <div>
          <h1>📤 My Uploads</h1>
          <p>Manage your performances</p>
        </div>
        <button className="mu-upload-btn" onClick={() => navigate('/upload')}>
          ⬆ Upload New
        </button>
      </div>

      {/* Stats */}
      {!loading && videos.length > 0 && (
        <div className="mu-stats">
          <div className="mu-stat">
            <span className="mu-stat-val">{videos.length}</span>
            <span className="mu-stat-label">Videos</span>
          </div>
          <div className="mu-stat">
            <span className="mu-stat-val">{formatViews(totalViews)}</span>
            <span className="mu-stat-label">Total Views</span>
          </div>
          <div className="mu-stat">
            <span className="mu-stat-val">{totalLikes}</span>
            <span className="mu-stat-label">Total Likes</span>
          </div>
          <div className="mu-stat">
            <span className="mu-stat-val">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
            <span className="mu-stat-label">Creator</span>
          </div>
        </div>
      )}

      {/* Filter */}
      {!loading && videos.length > 0 && (
        <div className="mu-filters">
          {categories.map(cat => (
            <button
              key={cat}
              className={`mu-filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="mu-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="mu-skeleton" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="mu-empty">
          <div className="mu-empty-icon">🎬</div>
          <h3>No uploads yet!</h3>
          <p>Share your talent with the world.</p>
          <button className="mu-upload-btn" onClick={() => navigate('/upload')}>
            ⬆ Upload Your First Video
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mu-empty">
          <div className="mu-empty-icon">🔍</div>
          <h3>No videos in "{filter}"</h3>
          <button className="mu-filter-btn active" onClick={() => setFilter('All')}>
            Show All
          </button>
        </div>
      ) : (
        <div className="mu-grid">
          {filtered.map(video => (
            <div key={video._id} className="mu-card">

              {/* Thumbnail */}
              <div className="mu-thumb">
                <video
                  src={`https://talenthub-w1cc.onrender.com${video.videoUrl}`}
                  muted
                  onMouseEnter={e => e.target.play()}
                  onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                />
                <div className="mu-thumb-overlay">
                  <button
                    className="mu-play-btn"
                    onClick={() => navigate(`/video/${video._id}`)}
                  >▶</button>
                </div>
                {video.category && (
                  <span className="mu-cat-badge">{video.category}</span>
                )}
                <div className="mu-views-badge">
                  👁 {formatViews(video.views)}
                </div>
              </div>

              {/* Info */}
              <div className="mu-info">
                <h3 className="mu-title" title={video.title}>{video.title}</h3>
                <div className="mu-meta">
                  <span>❤️ {video.likes?.length || 0}</span>
                  <span>📅 {formatDate(video.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mu-actions">
                <button
                  className="mu-view-btn"
                  onClick={() => navigate(`/video/${video._id}`)}
                >▶ View</button>
                <button
                  className="mu-delete-btn"
                  onClick={() => handleDelete(video._id)}
                  disabled={deletingId === video._id}
                >
                  {deletingId === video._id ? '...' : '🗑 Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
