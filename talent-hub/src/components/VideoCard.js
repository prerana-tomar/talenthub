import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './VideoCard.css';

const VideoCard = ({ video, currentUserId, onDelete }) => {
  const navigate = useNavigate();

  // ✅ Hooks pehle — guard baad mein
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [liked,      setLiked]      = useState(false);
  const [likeCount,  setLikeCount]  = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [savingVid,  setSavingVid]  = useState(false);
  const [following,  setFollowing]  = useState(false);
  const [followLoad, setFollowLoad] = useState(false);
  const [toast,      setToast]      = useState('');
  const [playing,    setPlaying]    = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [muted,      setMuted]      = useState(false);
  const videoRef = useRef(null);

  const token = localStorage.getItem('th_token');
  const me    = JSON.parse(localStorage.getItem('th_user') || 'null');

  useEffect(() => {
    if (!video) return;
    const arr = Array.isArray(video.likes) ? video.likes : [];
    setLikeCount(arr.length);
    setLiked(currentUserId ? arr.includes(currentUserId) : false);
  }, [video, currentUserId]);

  useEffect(() => {
    if (!video || !token || !currentUserId) return;
    const uid = video.uploader?._id || video.uploader;
    if (!uid) return;
    const stored = JSON.parse(localStorage.getItem('th_user') || 'null');
    if (!stored?.following) return;
    const isFollowing = Array.isArray(stored.following)
      ? stored.following.some(f => f === uid || f?._id === uid)
      : false;
    setFollowing(isFollowing);
  }, [video, currentUserId, token]);

  // ✅ Guard — saare hooks ke BAAD
  if (!video) return null;

  const uploaderName = video.uploader?.username || 'Unknown';
  const uploaderId   = video.uploader?._id || video.uploader;
  const videoSrc     = video.url || null;

  const isOwner = currentUserId && (
    video.uploader?._id === currentUserId ||
    video.uploader      === currentUserId ||
    video.userId        === currentUserId
  );

  const isMyVideo = (
    video.uploader?._id === me?._id ||
    video.uploader?._id === me?.id  ||
    video.uploader      === me?._id ||
    video.uploader      === me?.id
  );

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!token) { navigate('/login'); return; }
    if (!uploaderId) return;
    setFollowLoad(true);
    try {
      const res  = await fetch(`https://talenthub-w1cc.onrender.com/api/auth/follow/${uploaderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFollowing(data.following);
        showToast(data.following ? `✅ Following ${uploaderName}` : `➖ Unfollowed ${uploaderName}`);
        const stored = JSON.parse(localStorage.getItem('th_user') || 'null');
        if (stored) {
          const list = stored.following || [];
          stored.following = data.following
            ? [...list, uploaderId]
            : list.filter(id => id !== uploaderId && id?._id !== uploaderId);
          localStorage.setItem('th_user', JSON.stringify(stored));
        }
      } else {
        showToast(`❌ ${data.message}`);
      }
    } catch { showToast('❌ Network error'); }
    setFollowLoad(false);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!token) { navigate('/login'); return; }
    try {
      const res = await fetch(`https://talenthub-w1cc.onrender.com/api/videos/${video._id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLiked(prev => !prev);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
      }
    } catch {}
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!token) { navigate('/login'); return; }
    setSavingVid(true);
    try {
      const res  = await fetch(`https://talenthub-w1cc.onrender.com/api/saved/video/${video._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) { setSaved(data.saved); showToast(data.saved ? '🔖 Saved!' : '🗑 Unsaved'); }
    } catch { showToast('❌ Failed'); }
    setSavingVid(false);
  };

  const handleMessage = (e) => {
    e.stopPropagation();
    if (!token) { navigate('/login'); return; }
    if (!uploaderId || isMyVideo) return;
    navigate('/messages', { state: { startChat: { _id: uploaderId, username: uploaderName } } });
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/video/${video._id}`;
    if (navigator.share) { navigator.share({ title: video.title, url }); }
    else { navigator.clipboard.writeText(url); showToast('🔗 Link copied!'); }
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    setProgress((vid.currentTime / vid.duration) * 100);
    setDuration(vid.duration);
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    const rect = e.currentTarget.getBoundingClientRect();
    vid.currentTime = ((e.clientX - rect.left) / rect.width) * vid.duration;
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) { vid.play().catch(() => {}); setPlaying(true); }
    else { vid.pause(); setPlaying(false); }
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`https://talenthub-w1cc.onrender.com/api/videos/${video._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { if (onDelete) onDelete(video._id); }
      else { const d = await res.json(); alert(d.message || 'Failed'); }
    } catch { alert('Network error'); }
    finally { setDeleting(false); setShowDeleteConfirm(false); }
  };

  return (
    <div className="video-card">
      {toast && <div className="vc-toast">{toast}</div>}

      {video.category && (
        <span className="video-category-badge">{video.category}</span>
      )}

      {isOwner && (
        <button
          className="delete-btn"
          onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true); }}
        >🗑</button>
      )}

      <div className="video-thumbnail" onClick={() => navigate(`/video/${video._id}`)}>
        {videoSrc && !videoError ? (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              muted={muted}
              preload="metadata"
              onError={() => setVideoError(true)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              onEnded={() => setPlaying(false)}
              onMouseEnter={e => {
                e.stopPropagation();
                if (!playing) { e.target.play().catch(() => {}); setPlaying(true); }
              }}
              onMouseLeave={e => {
                e.stopPropagation();
                if (playing) {
                  e.target.pause();
                  setPlaying(false);
                  e.target.currentTime = 0;
                  setProgress(0);
                }
              }}
              className={playing ? 'vc-playing' : ''}
            />

            {!playing && (
              <div className="vc-play-overlay"
                onClick={e => { e.stopPropagation(); navigate(`/video/${video._id}`); }}
              >
                <div className="vc-play-btn-big">▶</div>
              </div>
            )}

            {playing && (
              <div className="vc-controls" onClick={e => e.stopPropagation()}>
                <button className="vc-ctrl-btn" onClick={togglePlay}>⏸</button>
                <div className="vc-progress-bar" onClick={handleSeek}>
                  <div className="vc-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="vc-time">
                  {formatTime(videoRef.current?.currentTime)} / {formatTime(duration)}
                </span>
                <button className="vc-ctrl-btn" onClick={toggleMute}>
                  {muted ? '🔇' : '🔊'}
                </button>
                <button className="vc-ctrl-btn"
                  onClick={e => { e.stopPropagation(); navigate(`/video/${video._id}`); }}
                >⛶</button>
              </div>
            )}

            <div className="view-badge">
              <span>👁</span><span>{video.views || 0}</span>
            </div>
          </>
        ) : (
          <div className="video-placeholder">
            <span>🎬</span><p>Preview unavailable</p>
          </div>
        )}
      </div>

      <div className="video-card-body">
        <h3 className="video-title" onClick={() => navigate(`/video/${video._id}`)}>
          {video.title}
        </h3>

        <div className="video-meta">
          <div className="uploader-row">
            <div className="uploader-avatar">
              {video.uploader?.profilePic ? (
                <img src={`https://talenthub-w1cc.onrender.com${video.uploader.profilePic}`} alt={uploaderName} />
              ) : (
                <span>{uploaderName?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>
            <span className="uploader-name">{uploaderName}</span>
            <span className="video-date">{formatDate(video.createdAt)}</span>
            {!isMyVideo && currentUserId && (
              <button
                className={`vc-follow-btn${following ? ' following' : ''}`}
                onClick={handleFollow}
                disabled={followLoad}
              >
                {followLoad ? '...' : following ? '✓ Following' : '+ Follow'}
              </button>
            )}
          </div>
        </div>

        <div className="video-actions">
          <button className={`action-btn like-btn${liked ? ' liked' : ''}`} onClick={handleLike}>
            {liked ? '❤️' : '🤍'} <span>{likeCount}</span>
          </button>
          <button
            className={`action-btn save-btn${saved ? ' saved' : ''}`}
            onClick={handleSave}
            disabled={savingVid}
          >
            {saved ? '🔖' : '➕'} <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
          {!isMyVideo && (
            <button className="action-btn msg-btn" onClick={handleMessage}>💬</button>
          )}
          <button className="action-btn share-btn" onClick={handleShare}>↗</button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="delete-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon">🗑️</div>
            <h3>Delete Video?</h3>
            <p>"<strong>{video.title}</strong>" permanently delete ho jayega.</p>
            <div className="delete-modal-actions">
              <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </button>
              <button className="confirm-delete-btn" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCard;
