import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage]   = useState({ text: '', type: '' });
  const [loading, setLoading]   = useState(false);
  const [videos, setVideos]     = useState([]);
  const [videoLoad, setVideoLoad] = useState(false);
  const [deleting, setDeleting] = useState(null); // video id being deleted

  const token = localStorage.getItem('th_token');
  const user  = JSON.parse(localStorage.getItem('th_user') || '{}');

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      username: user.username || '',
      email:    user.email    || '',
    }));
  }, []);

  // Fetch uploaded videos when tab opens
  useEffect(() => {
    if (activeTab === 'videos') fetchMyVideos();
  }, [activeTab]);

  const fetchMyVideos = async () => {
    setVideoLoad(true);
    try {
      const res  = await fetch('http://localhost:5000/api/videos/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setVideos([]);
    } finally {
      setVideoLoad(false);
    }
  };

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch('http://localhost:5000/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: formData.username, email: formData.email }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('th_user', JSON.stringify(data.user || { ...user, username: formData.username }));
        showMsg('✅ Profile updated successfully!');
      } else {
        showMsg(data.message || 'Update failed', 'error');
      }
    } catch {
      showMsg('❌ Cannot connect to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      showMsg('❌ Passwords do not match!', 'error'); return;
    }
    if (formData.newPassword.length < 6) {
      showMsg('❌ Min 6 characters required!', 'error'); return;
    }
    setLoading(true);
    try {
      const res  = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword:     formData.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('✅ Password changed successfully!');
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        showMsg(data.message || 'Failed to change password', 'error');
      }
    } catch {
      showMsg('❌ Cannot connect to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure you want to DELETE your account?\n\nThis will permanently delete:\n• Your account\n• All your uploaded videos\n• All your data\n\nThis CANNOT be undone!'
    );
    if (!confirmed) return;

    // Second confirmation
    const reconfirmed = window.confirm('Last warning! Click OK to permanently delete your account.');
    if (!reconfirmed) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/delete-account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        localStorage.clear();
        showMsg('Account deleted. Redirecting...', 'success');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      } else {
        const data = await res.json();
        showMsg(data.message || '❌ Delete failed!', 'error');
      }
    } catch {
      showMsg('❌ Cannot connect to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId, videoTitle) => {
    if (!window.confirm(`Delete "${videoTitle}"?\n\nThis cannot be undone.`)) return;
    setDeleting(videoId);
    try {
      const res = await fetch(`http://localhost:5000/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setVideos(prev => prev.filter(v => v._id !== videoId));
        showMsg('✅ Video deleted successfully!');
      } else {
        const data = await res.json();
        showMsg(data.message || '❌ Delete failed!', 'error');
      }
    } catch {
      showMsg('❌ Cannot connect to server.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const TABS = [
    { id: 'account',  icon: '👤', label: 'Account'     },
    { id: 'password', icon: '🔒', label: 'Password'    },
    { id: 'videos',   icon: '📹', label: 'My Videos'   },
    { id: 'danger',   icon: '⚠️', label: 'Danger Zone' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-container">

        <div className="settings-header-row">
          <h1 className="settings-title">⚙️ Settings</h1>
          <button className="settings-back-btn" onClick={() => navigate('/')}>← Back to Home</button>
        </div>

        {/* TABS */}
        <div className="settings-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.id === 'danger' ? 'danger-tab' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* MESSAGE */}
        {message.text && (
          <div className={`settings-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div className="settings-card">
            <div className="settings-avatar-row">
              <div className="settings-avatar-circle">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="settings-avatar-name">{user.username || 'User'}</div>
                <div className="settings-avatar-email">{user.email || ''}</div>
              </div>
            </div>

            <form className="settings-form" onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Your username"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Your email"
                  required
                />
              </div>
              <button type="submit" className="save-btn" disabled={loading}>
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* PASSWORD TAB */}
        {activeTab === 'password' && (
          <div className="settings-card">
            <form className="settings-form" onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <button type="submit" className="save-btn" disabled={loading}>
                {loading ? 'Changing...' : '🔒 Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* MY VIDEOS TAB */}
        {activeTab === 'videos' && (
          <div className="settings-card">
            <div className="videos-tab-header">
              <h3>📹 My Uploaded Videos</h3>
              <span className="videos-count">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
            </div>

            {videoLoad ? (
              <div className="videos-loading">
                {[1,2,3].map(i => <div key={i} className="video-skeleton" />)}
              </div>
            ) : videos.length === 0 ? (
              <div className="videos-empty">
                <div className="videos-empty-icon">🎬</div>
                <h4>No videos uploaded yet</h4>
                <p>Start sharing your talent with the world!</p>
                <button className="save-btn" style={{marginTop:16}} onClick={() => navigate('/upload')}>
                  ⬆ Upload Now
                </button>
              </div>
            ) : (
              <div className="videos-list">
                {videos.map(video => (
                  <div key={video._id} className="video-row">

                    {/* Thumbnail */}
                    <div className="video-row-thumb">
                      <video
                        src={`http://localhost:5000${video.videoUrl || video.url || ''}`}
                        muted
                        onMouseEnter={e => e.target.play()}
                        onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                      />
                      <span className="video-row-cat">{video.category || 'Other'}</span>
                    </div>

                    {/* Info */}
                    <div className="video-row-info">
                      <div className="video-row-title">{video.title}</div>
                      <div className="video-row-meta">
                        <span>👁 {video.views || 0} views</span>
                        <span>❤️ {Array.isArray(video.likes) ? video.likes.length : 0} likes</span>
                        <span>📅 {formatDate(video.createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="video-row-actions">
                      <button
                        className="video-view-btn"
                        onClick={() => navigate(`/video/${video._id}`)}
                      >
                        ▶ View
                      </button>
                      <button
                        className="video-delete-btn"
                        onClick={() => handleDeleteVideo(video._id, video.title)}
                        disabled={deleting === video._id}
                      >
                        {deleting === video._id ? '...' : '🗑 Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DANGER ZONE TAB */}
        {activeTab === 'danger' && (
          <div className="settings-card danger-card">

            {/* Logout */}
            <div className="danger-item">
              <div className="danger-item-left">
                <div className="danger-item-title">🚪 Log Out</div>
                <div className="danger-item-sub">Log out from your account on this device</div>
              </div>
              <button
                className="logout-danger-btn"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
              >
                Log Out
              </button>
            </div>

            <div className="danger-divider" />

            {/* Delete Account */}
            <div className="danger-item">
              <div className="danger-item-left">
                <div className="danger-item-title" style={{color:'#ef4444'}}>
                  🗑️ Delete Account
                </div>
                <div className="danger-item-sub">
                  Permanently delete your account, all videos, and data.<br/>
                  <strong style={{color:'#ef4444'}}>This action cannot be undone!</strong>
                </div>
              </div>
              <button
                className="delete-account-btn"
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                {loading ? 'Deleting...' : '🗑️ Delete My Account'}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;