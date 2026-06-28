import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Profile.css';

const API = 'https://talenthub-w1cc.onrender.com';

const BADGES = [
  { icon: '🔥', label: 'Trending',     desc: 'Video trended in top 10',  color: '#f97316' },
  { icon: '⭐', label: 'Rising Star',  desc: '100+ likes received',       color: '#eab308' },
  { icon: '🎤', label: 'Performer',    desc: 'Uploaded 1+ performance',   color: '#a78bfa' },
  { icon: '👑', label: 'Elite',        desc: '1000+ total views',         color: '#f59e0b' },
  { icon: '❤️', label: 'Fan Favorite', desc: 'Most liked this month',     color: '#ec4899' },
  { icon: '🏆', label: 'Champion',     desc: 'Won a competition',         color: '#10b981' },
];

const CATEGORIES = ['Singing','Dance','Rap','Comedy','Acting','Instrumental','Poetry','Other'];

export default function Profile() {
  const navigate = useNavigate();
  const { id }   = useParams(); // ✅ Other user ka ID

  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');
  const token = localStorage.getItem('th_token');

  // ✅ Own profile check
  const isOwnProfile = !id || id === user?._id || id === user?.id;

  const [profile,      setProfile]      = useState(null);
  const [videos,       setVideos]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [videoLoad,    setVideoLoad]    = useState(true);
  const [activeTab,    setActiveTab]    = useState('videos');
  const [editMode,     setEditMode]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState('');
  const [isFollowing,  setIsFollowing]  = useState(false);
  const [followLoad,   setFollowLoad]   = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const [editUsername, setEditUsername] = useState('');
  const [editBio,      setEditBio]      = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => {
    if (isOwnProfile && !token) { navigate('/login'); return; }
    fetchProfile();
    fetchVideos();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      if (isOwnProfile) {
        // Own profile
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setFollowerCount(data.followers?.length || 0);
          setEditUsername(data.username || '');
          setEditBio(data.bio || '');
          setEditCategory(data.category || '');
        } else {
          setProfile(user);
          setEditUsername(user?.username || '');
          setEditBio(user?.bio || '');
          setEditCategory(user?.category || '');
        }
      } else {
        // Other user profile
        const res = await fetch(`${API}/api/auth/user/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setFollowerCount(data.followers?.length || 0);
          // Check if I follow this user
          const myId = user?._id || user?.id;
          setIsFollowing(data.followers?.some(f =>
            (f._id || f)?.toString() === myId?.toString()
          ));
        }
      }
    } catch {
      if (isOwnProfile) setProfile(user);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    setVideoLoad(true);
    try {
      const url = isOwnProfile
        ? `${API}/api/videos/my`
        : `${API}/api/videos?uploader=${id}`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : (data.videos || []));
      } else setVideos([]);
    } catch { setVideos([]); }
    finally  { setVideoLoad(false); }
  };

  const handleFollow = async () => {
    if (!token) { navigate('/login'); return; }
    setFollowLoad(true);
    try {
      const res  = await fetch(`${API}/api/auth/follow/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setIsFollowing(data.following);
        setFollowerCount(prev => data.following ? prev + 1 : prev - 1);
        showToast(data.following ? `✅ Following!` : `👋 Unfollowed`);
      }
    } catch { showToast('❌ Error'); }
    setFollowLoad(false);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    if (!editUsername.trim()) { showToast('❌ Username required!'); return; }
    setSaving(true);
    try {
      await fetch(`${API}/api/auth/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: editUsername, bio: editBio, category: editCategory })
      });
      const updated = { ...user, username: editUsername, bio: editBio, category: editCategory };
      localStorage.setItem('th_user', JSON.stringify(updated));
      setProfile(prev => ({ ...prev, username: editUsername, bio: editBio, category: editCategory }));
      setEditMode(false);
      showToast('✅ Profile updated!');
    } catch { showToast('❌ Update failed!'); }
    setSaving(false);
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      const res = await fetch(`${API}/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { setVideos(prev => prev.filter(v => v._id !== videoId)); showToast('✅ Deleted!'); }
    } catch { showToast('❌ Delete failed!'); }
  };

  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (Array.isArray(v.likes) ? v.likes.length : 0), 0);

  const earnedBadges = BADGES.filter((_, i) => {
    if (i === 0) return totalViews >= 500;
    if (i === 1) return totalLikes >= 100;
    if (i === 2) return videos.length >= 1;
    if (i === 3) return totalViews >= 1000;
    if (i === 4) return totalLikes >= 50;
    return false;
  });

  const displayName     = profile?.username || user?.username || 'User';
  const displayEmail    = isOwnProfile ? (profile?.email || user?.email || '') : '';
  const displayBio      = profile?.bio      || '';
  const displayCategory = profile?.category || '';

  if (loading) return (
    <div className="profile-loading">
      <div className="profile-spinner" />
      <p>Loading profile...</p>
    </div>
  );

  return (
    <div className="profile-page">
      {toast && <div className="profile-toast">{toast}</div>}

      <div className="profile-cover">
        <div className="profile-cover-gradient" />
        <div className="profile-cover-pattern" />
      </div>

      <div className="profile-main">
        <div className="profile-top">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{displayName[0]?.toUpperCase() || 'U'}</div>
            <div className="profile-avatar-ring" />
          </div>

          <div className="profile-info">
            {editMode && isOwnProfile ? (
              <div className="profile-edit-form">
                <input className="profile-edit-input" value={editUsername}
                  onChange={e => setEditUsername(e.target.value)} placeholder="Username" />
                <textarea className="profile-edit-textarea" value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Write something about yourself..." rows={2} maxLength={200} />
                <select className="profile-edit-select" value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}>
                  <option value="">Select your talent category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="profile-edit-btns">
                  <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : '💾 Save'}
                  </button>
                  <button className="profile-cancel-btn" onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="profile-name-row">
                  <h1 className="profile-name">{displayName}</h1>
                  {displayCategory && <span className="profile-category-badge">{displayCategory}</span>}

                  {/* ✅ Own = Edit, Other = Follow */}
                  {isOwnProfile ? (
                    <button className="profile-edit-btn" onClick={() => setEditMode(true)}>✏️ Edit Profile</button>
                  ) : token && (
                    <button
                      className={`profile-follow-btn ${isFollowing ? 'following' : ''}`}
                      onClick={handleFollow}
                      disabled={followLoad}
                    >
                      {followLoad ? '...' : isFollowing ? '✓ Following' : '+ Follow'}
                    </button>
                  )}
                </div>

                {displayEmail && <p className="profile-email">📧 {displayEmail}</p>}

                <p className="profile-followers-info">
                  👥 <strong>{followerCount}</strong> Followers
                  {profile?.following?.length !== undefined && (
                    <> · <strong>{profile.following.length}</strong> Following</>
                  )}
                </p>

                {displayBio ? (
                  <p className="profile-bio">{displayBio}</p>
                ) : isOwnProfile ? (
                  <p className="profile-bio-empty">
                    No bio yet.{' '}
                    <span onClick={() => setEditMode(true)} style={{color:'#a78bfa', cursor:'pointer'}}>Add one ✏️</span>
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="profile-stats">
          {[
            { icon: '📹', val: videos.length, label: 'Videos' },
            { icon: '👁', val: totalViews >= 1000 ? (totalViews/1000).toFixed(1)+'K' : totalViews, label: 'Views' },
            { icon: '❤️', val: totalLikes, label: 'Likes' },
            { icon: '👥', val: followerCount, label: 'Followers' },
          ].map((s, i) => (
            <div key={i} className="profile-stat-box">
              <div className="profile-stat-icon">{s.icon}</div>
              <div className="profile-stat-val">{s.val}</div>
              <div className="profile-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="profile-tabs">
          {[
            { id: 'videos', icon: '📹', label: isOwnProfile ? 'My Videos' : 'Videos' },
            { id: 'badges', icon: '🏅', label: 'Badges' },
          ].map(tab => (
            <button key={tab.id}
              className={`profile-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="profile-tab-content">
          {activeTab === 'videos' && (
            videoLoad ? (
              <div className="profile-grid">
                {[1,2,3].map(i => <div key={i} className="profile-video-skeleton" />)}
              </div>
            ) : videos.length === 0 ? (
              <div className="profile-empty">
                <div className="profile-empty-icon">🎬</div>
                <h3>No videos uploaded yet</h3>
                {isOwnProfile && (
                  <>
                    <p>Upload your first performance and shine!</p>
                    <button className="profile-upload-btn" onClick={() => navigate('/upload')}>⬆ Upload Now</button>
                  </>
                )}
              </div>
            ) : (
              <div className="profile-grid">
                {videos.map(video => (
                  <div key={video._id} className="profile-video-card">
                    <div className="profile-video-thumb">
                      <video src={video.videoUrl || video.url || ''} muted
                        onMouseEnter={e => e.target.play()}
                        onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                        onClick={() => navigate(`/video/${video._id}`)} />
                      <div className="profile-video-overlay"><span>▶ Play</span></div>
                      <div className="profile-video-views">👁 {video.views || 0}</div>
                      <span className="profile-video-cat">{video.category || 'Other'}</span>
                      {isOwnProfile && (
                        <button className="profile-video-delete" onClick={() => handleDeleteVideo(video._id)}>🗑</button>
                      )}
                    </div>
                    <div className="profile-video-info">
                      <h4 className="profile-video-title">{video.title}</h4>
                      <div className="profile-video-meta">
                        <span>❤️ {Array.isArray(video.likes) ? video.likes.length : 0}</span>
                        <span>👁 {video.views || 0}</span>
                        <span>{new Date(video.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'badges' && (
            <div className="profile-badges-section">
              {earnedBadges.length > 0 && (
                <div>
                  <h3 className="profile-badges-title">🏅 Earned Badges ({earnedBadges.length})</h3>
                  <div className="profile-badges-grid">
                    {earnedBadges.map((b, i) => (
                      <div key={i} className="profile-badge-card earned" style={{ borderColor: b.color }}>
                        <div className="profile-badge-icon" style={{ background: b.color+'22', color: b.color }}>{b.icon}</div>
                        <div className="profile-badge-label">{b.label}</div>
                        <div className="profile-badge-desc">{b.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="profile-badges-title">🔒 Locked Badges</h3>
                <div className="profile-badges-grid">
                  {BADGES.filter(b => !earnedBadges.find(e => e.label === b.label)).map((b, i) => (
                    <div key={i} className="profile-badge-card locked">
                      <div className="profile-badge-icon locked-icon">{b.icon}</div>
                      <div className="profile-badge-label" style={{ color: '#475569' }}>{b.label}</div>
                      <div className="profile-badge-desc">{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}