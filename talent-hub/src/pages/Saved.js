import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Saved.css';

const API = '/api';

export default function Saved() {
  const navigate = useNavigate();
  const token = localStorage.getItem('th_token');
  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');

  const [activeTab,   setActiveTab]   = useState('videos');
  const [videos,      setVideos]      = useState([]);
  const [performers,  setPerformers]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVideos(Array.isArray(data.videos)     ? data.videos     : []);
      setPerformers(Array.isArray(data.performers) ? data.performers : []);
    } catch {
      setVideos([]); setPerformers([]);
    }
    setLoading(false);
  };

  const unsaveVideo = async (videoId) => {
    try {
      await fetch(`${API}/saved/video/${videoId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(prev => prev.filter(v => v._id !== videoId));
      showToast('🗑 Video unsaved');
    } catch { showToast('❌ Failed'); }
  };

  const unsavePerformer = async (performerId) => {
    try {
      await fetch(`${API}/saved/performer/${performerId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setPerformers(prev => prev.filter(p => p._id !== performerId));
      showToast('🗑 Performer unsaved');
    } catch { showToast('❌ Failed'); }
  };

  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="sv-page">
      {toast && <div className="sv-toast">{toast}</div>}

      {/* Header */}
      <div className="sv-header">
        <div className="sv-header-left">
          <h1 className="sv-title">🔖 Saved</h1>
          <p className="sv-sub">Your saved videos and performers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sv-tabs">
        <button
          className={`sv-tab${activeTab === 'videos' ? ' active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          📹 Videos <span className="sv-tab-count">{videos.length}</span>
        </button>
        <button
          className={`sv-tab${activeTab === 'performers' ? ' active' : ''}`}
          onClick={() => setActiveTab('performers')}
        >
          ⭐ Performers <span className="sv-tab-count">{performers.length}</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="sv-grid">
          {[1,2,3,4].map(i => <div key={i} className="sv-skeleton" />)}
        </div>
      ) : (
        <>
          {/* VIDEOS TAB */}
          {activeTab === 'videos' && (
            videos.length === 0 ? (
              <div className="sv-empty">
                <div className="sv-empty-icon">🎬</div>
                <h3>No saved videos yet</h3>
                <p>Save videos while browsing to find them here</p>
                <button className="sv-explore-btn" onClick={() => navigate('/explore')}>
                  🔍 Explore Videos
                </button>
              </div>
            ) : (
              <div className="sv-grid">
                {videos.map(video => (
                  <div key={video._id} className="sv-video-card">
                    <div
                      className="sv-video-thumb"
                      onClick={() => navigate(`/video/${video._id}`)}
                    >
                      <video
                        src={`${video.url || video.videoUrl || ''}`}
                        muted
                        onMouseEnter={e => e.target.play()}
                        onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                      />
                      <div className="sv-video-overlay">▶ Play</div>
                      <span className="sv-video-cat">{video.category || 'Other'}</span>
                      <span className="sv-video-views">👁 {fmt(video.views)}</span>
                    </div>
                    <div className="sv-video-info">
                      <h4 className="sv-video-title">{video.title}</h4>
                      <div className="sv-video-meta">
                        <span>👤 {video.uploader?.username || 'Unknown'}</span>
                        <span>❤️ {Array.isArray(video.likes) ? video.likes.length : 0}</span>
                      </div>
                      <div className="sv-video-actions">
                        <button
                          className="sv-play-btn"
                          onClick={() => navigate(`/video/${video._id}`)}
                        >▶ Watch</button>
                        <button
                          className="sv-unsave-btn"
                          onClick={() => unsaveVideo(video._id)}
                        >🗑 Unsave</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* PERFORMERS TAB */}
          {activeTab === 'performers' && (
            performers.length === 0 ? (
              <div className="sv-empty">
                <div className="sv-empty-icon">⭐</div>
                <h3>No saved performers yet</h3>
                <p>Save performers from their profile to see them here</p>
                <button className="sv-explore-btn" onClick={() => navigate('/explore')}>
                  🔍 Discover Performers
                </button>
              </div>
            ) : (
              <div className="sv-performers-list">
                {performers.map(p => (
                  <div key={p._id} className="sv-performer-card">
                    <div className="sv-perf-avatar">
                      {p.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="sv-perf-info">
                      <div className="sv-perf-name">{p.username}</div>
                      {p.category && <div className="sv-perf-cat">{p.category}</div>}
                      {p.bio && <div className="sv-perf-bio">{p.bio.slice(0,80)}{p.bio.length > 80 ? '...' : ''}</div>}
                    </div>
                    <div className="sv-perf-actions">
                      <button
                        className="sv-msg-btn"
                        onClick={() => navigate('/messages', { state: { startChat: p } })}
                      >💬 Message</button>
                      <button
                        className="sv-unsave-btn"
                        onClick={() => unsavePerformer(p._id)}
                      >🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
