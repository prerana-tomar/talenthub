import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../config';
import AchievementCard from '../components/AchievementCard';
import AchievementPopup from '../components/AchievementPopup';
import './Profile.css';

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
  const [achievements, setAchievements] = useState([]);
  const [unlockedPopup, setUnlockedPopup] = useState([]);

  const [editUsername, setEditUsername] = useState('');
  const [editBio,      setEditBio]      = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [uploadingPic, setUploadingPic] = useState(false);
  const [viewPic,      setViewPic]      = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('❌ Please select an image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('❌ Max size is 5MB.');
      return;
    }

    const fileData = new FormData();
    fileData.append('profilePic', file);

    setUploadingPic(true);
    try {
      const res = await fetch(`${API}/api/auth/upload-pic`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: fileData
      });
      const data = await res.json();
      if (res.ok && data.user) {
        const currentUserObj = JSON.parse(localStorage.getItem('th_user') || 'null') || {};
        const updatedUser = { ...currentUserObj, profilePic: data.user.profilePic };
        localStorage.setItem('th_user', JSON.stringify(updatedUser));
        setProfile(prev => ({ ...prev, profilePic: data.user.profilePic }));
        showToast('✅ Profile picture updated!');
        window.dispatchEvent(new Event('storage'));
      } else {
        showToast(data.message || '❌ Upload failed.');
      }
    } catch {
      showToast('❌ Server error.');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('❌ Please select an image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('❌ Max size is 5MB.');
      return;
    }

    const fileData = new FormData();
    fileData.append('coverPic', file);

    setUploadingCover(true);
    try {
      const res = await fetch(`${API}/api/auth/upload-cover`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: fileData
      });
      const data = await res.json();
      if (res.ok && data.user) {
        const currentUserObj = JSON.parse(localStorage.getItem('th_user') || 'null') || {};
        const updatedUser = { ...currentUserObj, coverPic: data.user.coverPic };
        localStorage.setItem('th_user', JSON.stringify(updatedUser));
        setProfile(prev => ({ ...prev, coverPic: data.user.coverPic }));
        showToast('✅ Cover picture updated!');
        window.dispatchEvent(new Event('storage'));
      } else {
        showToast(data.message || '❌ Upload failed.');
      }
    } catch {
      showToast('❌ Server error.');
    } finally {
      setUploadingCover(false);
    }
  };

  useEffect(() => {
    if (isOwnProfile && !token) { navigate('/login'); return; }
    fetchProfile();
    fetchVideos();
    fetchAchievements();
  }, [id]);

  const fetchAchievements = async () => {
    try {
      const targetId = !id || id === user?._id || id === user?.id ? (user?._id || user?.id) : id;
      if (!targetId) return;
      const res = await fetch(`${API}/api/achievements/user/${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setAchievements(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

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
      const currentUserObj = JSON.parse(localStorage.getItem('th_user') || 'null') || {};
      const updated = { ...currentUserObj, username: editUsername, bio: editBio, category: editCategory };
      localStorage.setItem('th_user', JSON.stringify(updated));
      setProfile(prev => ({ ...prev, username: editUsername, bio: editBio, category: editCategory }));
      setEditMode(false);
      showToast('✅ Profile updated!');
      window.dispatchEvent(new Event('storage'));
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
        {profile?.coverPic ? (
          <img src={profile.coverPic} alt="Cover" className="profile-cover-img" />
        ) : (
          <>
            <div className="profile-cover-gradient" />
            <div className="profile-cover-pattern" />
          </>
        )}
        
        {/* Cover Photo Upload Button — only visible if it's own profile */}
        {isOwnProfile && (
          <div className="profile-cover-upload-btn-wrap">
            <label className="profile-cover-upload-label" htmlFor="profile-cover-file">
              {uploadingCover ? '🔄' : '📷 Edit Cover'}
            </label>
            <input
              type="file"
              id="profile-cover-file"
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleCoverFileChange}
              disabled={uploadingCover}
            />
          </div>
        )}
      </div>

      <div className="profile-main">
        <div className="profile-top">
          <div 
            className="profile-avatar-wrap" 
            onClick={() => profile?.profilePic && setViewPic(true)} 
            style={{ cursor: profile?.profilePic ? 'pointer' : 'default' }}
            title={profile?.profilePic ? 'Click to view profile picture' : ''}
          >
            <div className="profile-avatar">
              {profile?.profilePic ? (
                <img src={profile.profilePic} alt={displayName} className="profile-avatar-img" />
              ) : (
                displayName[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div className="profile-avatar-ring" />
            {profile?.profilePic && (
              <div className="profile-avatar-hover-eye">
                <span>👁️</span>
              </div>
            )}
          </div>

          <div className="profile-info">
            {editMode && isOwnProfile ? (
              <div className="profile-edit-form">
                <div className="profile-edit-avatar-upload">
                  <label className="profile-upload-pic-label" htmlFor="profile-avatar-file">
                    {uploadingPic ? 'Uploading...' : '📷 Change Profile Picture'}
                  </label>
                  <input
                    type="file"
                    id="profile-avatar-file"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploadingPic}
                  />
                </div>
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
            { id: 'achievements', icon: '🏆', label: 'Achievements & Badges' },
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

          {(activeTab === 'achievements' || activeTab === 'badges') && (
            <div className="profile-achievements-section">
              <div className="profile-achievements-header">
                <h3>🏆 Performer Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length || 10})</h3>
                <p>Unlock badges automatically as you grow your views, appreciations, and audience on TalentHub!</p>
              </div>

              <div className="profile-achievements-grid">
                {achievements.map(ach => (
                  <AchievementCard key={ach.key} achievement={ach} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── UNLOCK POPUP ANIMATION ── */}
      <AchievementPopup achievements={unlockedPopup} onClose={() => setUnlockedPopup([])} />

      {/* ── PROFILE PIC LIGHTBOX MODAL ── */}
      {viewPic && profile?.profilePic && (
        <div className="profile-pic-modal" onClick={() => setViewPic(false)}>
          <div className="profile-pic-modal-content" onClick={e => e.stopPropagation()}>
            <button className="profile-pic-modal-close" onClick={() => setViewPic(false)}>✕</button>
            <img src={profile.profilePic} alt={displayName} className="profile-pic-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
}