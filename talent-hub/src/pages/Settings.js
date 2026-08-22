import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Video, AlertTriangle, Save, CheckCircle2, XCircle,
  Upload, Play, Trash2, LogOut, Eye, Heart, Calendar, Clapperboard,
  ShieldAlert, KeyRound, Bell
} from 'lucide-react';
import API from '../config';
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
  const [uploadingPic, setUploadingPic] = useState(false);
  const [videos, setVideos]     = useState([]);
  const [videoLoad, setVideoLoad] = useState(false);
  const [deleting, setDeleting] = useState(null); // video id being deleted

  const [notifSettings, setNotifSettings] = useState({
    likes: true,
    comments: true,
    follows: true,
    competitions: true,
    uploads: true,
    messages: true
  });
  const [fetchingSettings, setFetchingSettings] = useState(false);

  const token = localStorage.getItem('th_token');
  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem('th_user') || '{}');
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      username: currentUser.username || '',
      email:    currentUser.email    || '',
    }));
  }, [currentUser]);

  // Fetch uploaded videos when tab opens
  useEffect(() => {
    if (activeTab === 'videos') fetchMyVideos();
    if (activeTab === 'notifications') fetchNotifSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchNotifSettings = async () => {
    setFetchingSettings(true);
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.notificationSettings) {
        setNotifSettings({
          likes: data.notificationSettings.likes !== false,
          comments: data.notificationSettings.comments !== false,
          follows: data.notificationSettings.follows !== false,
          competitions: data.notificationSettings.competitions !== false,
          uploads: data.notificationSettings.uploads !== false,
          messages: data.notificationSettings.messages !== false
        });
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
    } finally {
      setFetchingSettings(false);
    }
  };

  const handleSaveNotifSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/notification-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ settings: notifSettings })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('Notification preferences saved successfully!');
        const updated = { ...currentUser, notificationSettings: data.settings || notifSettings };
        localStorage.setItem('th_user', JSON.stringify(updated));
        setCurrentUser(updated);
      } else {
        showMsg(data.message || 'Failed to save settings', 'error');
      }
    } catch {
      showMsg('Cannot connect to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyVideos = async () => {
    setVideoLoad(true);
    try {
      const res  = await fetch(`${API}/api/videos/my`, {
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

  const handleAvatarClick = () => {
    document.getElementById('avatar-file-input').click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMsg('Please select a valid image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMsg('Image size should be less than 5MB.', 'error');
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
        const updated = { ...currentUser, profilePic: data.user.profilePic };
        localStorage.setItem('th_user', JSON.stringify(updated));
        setCurrentUser(updated);
        showMsg('Profile picture updated successfully!');
        // Dispatch event for other components like Navbar to update immediately
        window.dispatchEvent(new Event('storage'));
      } else {
        showMsg(data.message || 'Upload failed.', 'error');
      }
    } catch {
      showMsg('Cannot connect to server.', 'error');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: formData.username, email: formData.email }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = data.user || { ...currentUser, username: formData.username, email: formData.email };
        localStorage.setItem('th_user', JSON.stringify(updated));
        setCurrentUser(updated);
        showMsg('Profile updated successfully!');
        window.dispatchEvent(new Event('storage'));
      } else {
        showMsg(data.message || 'Update failed', 'error');
      }
    } catch {
      showMsg('Cannot connect to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      showMsg('Passwords do not match!', 'error'); return;
    }
    if (formData.newPassword.length < 6) {
      showMsg('Min 6 characters required!', 'error'); return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/auth/change-password`, {
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
        showMsg('Password changed successfully!');
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        showMsg(data.message || 'Failed to change password', 'error');
      }
    } catch {
      showMsg('Cannot connect to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to DELETE your account?\n\nThis will permanently delete:\n• Your account\n• All your uploaded videos\n• All your data\n\nThis CANNOT be undone!'
    );
    if (!confirmed) return;

    // Second confirmation
    const reconfirmed = window.confirm('Last warning! Click OK to permanently delete your account.');
    if (!reconfirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        localStorage.clear();
        showMsg('Account deleted. Redirecting...', 'success');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      } else {
        const data = await res.json();
        showMsg(data.message || 'Delete failed!', 'error');
      }
    } catch {
      showMsg('Cannot connect to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId, videoTitle) => {
    if (!window.confirm(`Delete "${videoTitle}"?\n\nThis cannot be undone.`)) return;
    setDeleting(videoId);
    try {
      const res = await fetch(`${API}/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setVideos(prev => prev.filter(v => v._id !== videoId));
        showMsg('Video deleted successfully!');
      } else {
        const data = await res.json();
        showMsg(data.message || 'Delete failed!', 'error');
      }
    } catch {
      showMsg('Cannot connect to server.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const TABS = [
    { id: 'account',  icon: User,          label: 'Account'     },
    { id: 'password', icon: Lock,          label: 'Password'    },
    { id: 'videos',   icon: Video,         label: 'My Videos'   },
    { id: 'notifications', icon: Bell,     label: 'Notifications' },
    { id: 'danger',   icon: AlertTriangle, label: 'Danger Zone' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-container">

        <div className="settings-header-row">
          <h1 className="settings-title">Settings</h1>
          <button className="settings-back-btn" onClick={() => navigate('/')}>← Back to Home</button>
        </div>

        {/* TABS */}
        <div className="settings-tabs">
          {TABS.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.id === 'danger' ? 'danger-tab' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <TabIcon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MESSAGE */}
        {message.text && (
          <div className={`settings-message ${message.type}`}>
            {message.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div className="settings-card">
            <div className="settings-avatar-row">
              <div className="settings-avatar-circle" onClick={handleAvatarClick} title="Click to upload profile picture">
                {currentUser.profilePic ? (
                  <img src={currentUser.profilePic} alt={currentUser.username} className="settings-avatar-img" />
                ) : (
                  currentUser.username?.[0]?.toUpperCase() || 'U'
                )}
                
                {uploadingPic ? (
                  <div className="settings-avatar-uploading">
                    <div className="settings-avatar-uploading-spinner" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="settings-avatar-overlay">Change</div>
                )}
              </div>
              <div>
                <div className="settings-avatar-name">{currentUser.username || 'User'}</div>
                <div className="settings-avatar-email">{currentUser.email || ''}</div>
                <input
                  type="file"
                  id="avatar-file-input"
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div className="avatar-upload-btn-row">
                  <label htmlFor="avatar-file-input" className="avatar-upload-label">
                    <Upload size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Upload Picture
                  </label>
                </div>
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
                <Save size={16} />
                {loading ? 'Saving...' : 'Save Changes'}
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
                <KeyRound size={16} />
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* MY VIDEOS TAB */}
        {activeTab === 'videos' && (
          <div className="settings-card">
            <div className="videos-tab-header">
              <h3><Video size={17} style={{ marginRight: '8px', verticalAlign: 'middle' }} />My Uploaded Videos</h3>
              <span className="videos-count">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
            </div>

            {videoLoad ? (
              <div className="videos-loading">
                {[1,2,3].map(i => <div key={i} className="video-skeleton" />)}
              </div>
            ) : videos.length === 0 ? (
              <div className="videos-empty">
                <div className="videos-empty-icon"><Clapperboard size={44} /></div>
                <h4>No videos uploaded yet</h4>
                <p>Start sharing your talent with the world!</p>
                <button className="save-btn" style={{marginTop:16}} onClick={() => navigate('/upload')}>
                  <Upload size={16} /> Upload Now
                </button>
              </div>
            ) : (
              <div className="videos-list">
                {videos.map(video => (
                  <div key={video._id} className="video-row">

                    {/* Thumbnail */}
                    <div className="video-row-thumb">
                      <video
                        src={`${video.videoUrl || video.url || ''}`}
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
                        <span><Eye size={12} /> {video.views || 0} views</span>
                        <span><Heart size={12} /> {Array.isArray(video.likes) ? video.likes.length : 0} likes</span>
                        <span><Calendar size={12} /> {formatDate(video.createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="video-row-actions">
                      <button
                        className="video-view-btn"
                        onClick={() => navigate(`/video/${video._id}`)}
                      >
                        <Play size={12} /> View
                      </button>
                      <button
                        className="video-delete-btn"
                        onClick={() => handleDeleteVideo(video._id, video.title)}
                        disabled={deleting === video._id}
                      >
                        <Trash2 size={12} /> {deleting === video._id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="settings-card">
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} style={{ color: '#a78bfa' }} />
                Notification Preferences
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Choose which types of alerts you'd like to receive on Talent Hub.
              </p>
            </div>

            {fetchingSettings ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Loading preferences...
              </div>
            ) : (
              <form className="settings-form" onSubmit={handleSaveNotifSettings}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { id: 'likes', label: 'Likes & Appreciations', desc: 'Alert when someone likes or appreciates your content' },
                    { id: 'comments', label: 'Comments', desc: 'Alert when someone comments on your thoughts or videos' },
                    { id: 'follows', label: 'Follows', desc: 'Alert when someone starts following your profile' },
                    { id: 'competitions', label: 'Competitions', desc: 'Alert when you join a competition or winners are declared' },
                    { id: 'uploads', label: 'Upload Approvals', desc: 'Alert when your video uploads are processed and approved' },
                    { id: 'messages', label: 'Direct Messages', desc: 'Alert when you receive direct chat messages' }
                  ].map(pref => (
                    <div key={pref.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{pref.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{pref.desc}</div>
                      </div>
                      <div
                        className={`th-toggle ${notifSettings[pref.id] ? 'on' : ''}`}
                        onClick={() => setNotifSettings(prev => ({ ...prev, [pref.id]: !prev[pref.id] }))}
                      >
                        <div className="th-toggle-thumb" />
                      </div>
                    </div>
                  ))}
                </div>

                <button type="submit" className="save-btn" style={{ marginTop: '20px' }} disabled={loading}>
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* DANGER ZONE TAB */}
        {activeTab === 'danger' && (
          <div className="settings-card danger-card">

            {/* Logout */}
            <div className="danger-item">
              <div className="danger-item-left">
                <div className="danger-item-title"><LogOut size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Log Out</div>
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
                  <ShieldAlert size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Delete Account
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
                <Trash2 size={14} /> {loading ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;