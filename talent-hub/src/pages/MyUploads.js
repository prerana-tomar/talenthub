import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Eye, Heart, Calendar, Trash2, Plus, UploadCloud, User } from 'lucide-react';
import API from '../config';
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
      const res  = await fetch(`${API}/api/videos/my`, {
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
      const res = await fetch(`${API}/api/videos/${id}`, {
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
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UploadCloud size={32} color="#a78bfa" /> My Uploads</h1>
          <p>Manage and analyze your performances</p>
        </div>
        <button className="mu-upload-btn" onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Upload New
        </button>
      </div>

      {/* Stats */}
      {!loading && videos.length > 0 && (
        <div className="mu-stats">
          <div className="mu-stat th-premium-card-redesign">
            <div className="mu-stat-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.08)', color: '#a78bfa' }}>
              <Video size={20} />
            </div>
            <div>
              <span className="mu-stat-val">{videos.length}</span>
              <span className="mu-stat-label">Videos</span>
            </div>
          </div>
          <div className="mu-stat th-premium-card-redesign">
            <div className="mu-stat-icon-wrapper" style={{ background: 'rgba(79, 172, 254, 0.08)', color: '#4facfe' }}>
              <Eye size={20} />
            </div>
            <div>
              <span className="mu-stat-val">{formatViews(totalViews)}</span>
              <span className="mu-stat-label">Total Views</span>
            </div>
          </div>
          <div className="mu-stat th-premium-card-redesign">
            <div className="mu-stat-icon-wrapper" style={{ background: 'rgba(236, 72, 153, 0.08)', color: '#ec4899' }}>
              <Heart size={20} />
            </div>
            <div>
              <span className="mu-stat-val">{totalLikes}</span>
              <span className="mu-stat-label">Total Likes</span>
            </div>
          </div>
          <div className="mu-stat th-premium-card-redesign">
            <div className="mu-stat-icon-wrapper" style={{ background: 'rgba(0, 200, 150, 0.08)', color: '#00c896' }}>
              <User size={20} />
            </div>
            <div>
              <span className="mu-stat-val" style={{ color: '#00c896' }}>{user?.username?.[0]?.toUpperCase() || 'U'}</span>
              <span className="mu-stat-label">Creator</span>
            </div>
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
        <div className="th-empty-state-illustrated">
          <div className="th-empty-state-icon-wrapper">
            <UploadCloud size={32} />
          </div>
          <h3>No uploads yet!</h3>
          <p>You haven't uploaded any video performances to TalentHub. Upload your first video to share your talent with the world!</p>
          <button className="th-empty-state-cta-btn" onClick={() => navigate('/upload')}>
            Upload Your First Video
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="th-empty-state-illustrated">
          <div className="th-empty-state-icon-wrapper">
            <Video size={32} />
          </div>
          <h3>No videos in "{filter}"</h3>
          <p>We couldn't find any uploaded performances matching category "{filter}". Try selecting a different filter.</p>
          <button className="th-empty-state-cta-btn" onClick={() => setFilter('All')}>
            Show All Videos
          </button>
        </div>
      ) : (
        <div className="mu-grid">
          {filtered.map(video => (
            <div key={video._id} className="mu-card th-premium-card-redesign">

              {/* Thumbnail */}
              <div className="mu-thumb">
                <video
                  src={`${video.videoUrl}`}
                  muted
                  poster={video.thumbnailUrl || undefined}
                  onMouseEnter={e => e.target.play()}
                  onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                />
                {!video.thumbnailUrl && (
                  <div className="video-thumb-placeholder-gradient">
                    <div className="play-icon-overlay">▶</div>
                  </div>
                )}
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Heart size={12} color="#ec4899" fill="#ec4899" /> {video.likes?.length || 0}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {formatDate(video.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mu-actions">
                <button
                  className="mu-view-btn"
                  onClick={() => navigate(`/video/${video._id}`)}
                >
                  Watch
                </button>
                <button
                  className="mu-del-btn"
                  disabled={deletingId === video._id}
                  onClick={() => handleDelete(video._id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Trash2 size={13} /> {deletingId === video._id ? 'Deleting' : 'Delete'}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
