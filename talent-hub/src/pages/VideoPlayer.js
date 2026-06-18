import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './VideoPlayer.css';

export default function VideoPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [related, setRelated] = useState([]);
  const [toast, setToast] = useState('');
  const videoRef = useRef(null);

  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');
  const token = localStorage.getItem('th_token');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    const fetchVideo = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`https://talenthub-w1cc.onrender.com/api/videos/${id}`);
        const data = await res.json();
        if (!data || !data._id) { setLoading(false); return; }
        setVideo(data);
        const arr = Array.isArray(data.likes) ? data.likes : [];
        setLikeCount(arr.length);
        setLiked(user ? arr.includes(user._id) : false);

        // View increment
        await fetch(`https://talenthub-w1cc.onrender.com/api/videos/${id}/view`, { method: 'POST' });

        // Related videos
        const relRes  = await fetch('https://talenthub-w1cc.onrender.com/api/videos');
        const relData = await relRes.json();
        setRelated(
          Array.isArray(relData)
            ? relData.filter(v => v && v._id && v._id !== id).slice(0, 8)
            : []
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id]);

  const handleLike = async () => {
    if (!token) { navigate('/login'); return; }
    try {
      const res = await fetch(`https://talenthub-w1cc.onrender.com/api/videos/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLiked(prev => !prev);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
        showToast(liked ? '💔 Unliked' : '❤️ Liked!');
      }
    } catch {}
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: video?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      showToast('🔗 Link copied!');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const fmt = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num/1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) return (
    <div className="vp-loading">
      <div className="vp-spinner" />
      <p>Loading video...</p>
    </div>
  );

  if (!video) return (
    <div className="vp-loading">
      <p style={{fontSize:18, marginBottom:16}}>Video not found.</p>
      <button className="vp-back-btn" onClick={() => navigate('/')}>Go Home</button>
    </div>
  );

  return (
    <div className="vp-page">
      {toast && <div className="vp-toast">{toast}</div>}

      {/* TOPBAR */}
      <header className="vp-topbar">
        <button className="vp-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="vp-topbar-logo" onClick={() => navigate('/')}>
          TALENT<span>HUB</span>
        </div>
        {user ? (
          <div className="vp-topbar-user">
            <div className="vp-topbar-avatar">
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <span>{user.username}</span>
          </div>
        ) : (
          <Link to="/login" className="vp-topbar-login">Login</Link>
        )}
      </header>

      <div className="vp-layout">

        {/* LEFT — Main Video */}
        <div className="vp-main">

          {/* Video Player */}
          <div className="vp-player-wrap">
            <video
              ref={videoRef}
              src={video.url}
              controls
              autoPlay
              className="vp-player"
              onError={e => e.target.style.display = 'none'}
            />
          </div>

          {/* Title */}
          <h1 className="vp-title">{video.title}</h1>

          {/* Meta Row */}
          <div className="vp-meta-row">
            <div className="vp-uploader">
              <div className="vp-avatar">
                {video.uploader?.profilePic ? (
                  <img src={`${video.uploader.profilePic}`} alt="" />
                ) : (
                  <span>{video.uploader?.username?.[0]?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="vp-uploader-info">
                <span className="vp-uploader-name">{video.uploader?.username || 'Unknown'}</span>
                <span className="vp-upload-date">{formatDate(video.createdAt)}</span>
              </div>
            </div>

            <div className="vp-actions">
              <button className={`vp-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
                {liked ? '❤️' : '🤍'} {fmt(likeCount)} Likes
              </button>
              <button className="vp-action-btn" onClick={handleShare}>
                ↗ Share
              </button>
              <div className="vp-views-badge">
                👁 {fmt(video.views || 0)} views
              </div>
            </div>
          </div>

          {/* Category */}
          {video.category && (
            <div className="vp-category-row">
              <span className="vp-category-badge">{video.category}</span>
            </div>
          )}

          {/* Description */}
          {video.description && (
            <div className="vp-description">
              <p>{video.description}</p>
            </div>
          )}
        </div>

        {/* RIGHT — Related Videos */}
        <aside className="vp-sidebar">
          <h3 className="vp-sidebar-title">More Videos</h3>
          <div className="vp-related-list">
            {related.length === 0 ? (
              <div style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No related videos found.
              </div>
            ) : (
              related.map(v => (
                <div
                  key={v._id}
                  className="vp-related-card"
                  onClick={() => navigate(`/video/${v._id}`)}
                >
                  <div className="vp-related-thumb">
                    <video
                      src={v.url}
                      muted
                      preload="metadata"
                      onError={e => e.target.style.display = 'none'}
                    />
                    {v.category && <span className="vp-related-cat">{v.category}</span>}
                  </div>
                  <div className="vp-related-info">
                    <div className="vp-related-title">{v.title}</div>
                    <div className="vp-related-meta">
                      {v.uploader?.username || 'Unknown'} · 👁 {fmt(v.views || 0)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
