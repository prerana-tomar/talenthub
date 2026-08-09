import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../config';
import './CollabHub.css';

const SKILLS = [
  { label: 'Singer',           icon: '🎤' },
  { label: 'Lyricist',         icon: '✍️' },
  { label: 'Composer',         icon: '🎼' },
  { label: 'Rapper',           icon: '🎙️' },
  { label: 'Music Producer',   icon: '🎛️' },
  { label: 'Poet',             icon: '📜' },
  { label: 'Voice Artist',     icon: '🔊' },
  { label: 'Instrumentalist',  icon: '🎸' },
];

const PROJECT_TYPES = [
  { label: 'Song',              icon: '🎵' },
  { label: 'Album',             icon: '💿' },
  { label: 'Jingle',            icon: '🔔' },
  { label: 'Podcast',           icon: '🎧' },
  { label: 'Short Film',        icon: '🎬' },
  { label: 'Stage Performance', icon: '🎭' },
];

const SKILL_LABELS   = SKILLS.map(s => s.label);
const PROJECT_LABELS = PROJECT_TYPES.map(p => p.label);

const getSkillIcon    = (label) => SKILLS.find(s => s.label === label)?.icon || '🎯';
const getProjectIcon  = (label) => PROJECT_TYPES.find(p => p.label === label)?.icon || '📂';

const STATS = [
  { icon: '🤝', label: 'Active Collabs', value: '120+' },
  { icon: '🎨', label: 'Creators',       value: '500+' },
  { icon: '🎵', label: 'Projects Done',  value: '80+'  },
  { icon: '🌟', label: 'Success Rate',   value: '94%'  },
];

export default function CollabHub() {
  const navigate = useNavigate();
  const token = localStorage.getItem('th_token');
  const me    = JSON.parse(localStorage.getItem('th_user') || 'null');

  const [activeTab,     setActiveTab]     = useState('feed');
  const [filterSkill,   setFilterSkill]   = useState('All');
  const [filterProject, setFilterProject] = useState('All');
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [skillNeeded,   setSkillNeeded]   = useState(SKILL_LABELS[0]);
  const [projectType,   setProjectType]   = useState(PROJECT_LABELS[0]);
  const [description,   setDescription]   = useState('');
  const [budget,        setBudget]        = useState('Free Collaboration');
  const [posting,       setPosting]       = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [toast,         setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'feed' ? `${API}/api/collab` : `${API}/api/collab/mine`;
      const headers  = token ? { Authorization: `Bearer ${token}` } : {};
      const res      = await fetch(endpoint, { headers });
      if (res.ok) { const data = await res.json(); setRequests(Array.isArray(data) ? data : []); }
      else setRequests([]);
    } catch { setRequests([]); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, [activeTab]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!token) { navigate('/login'); return; }
    if (!description.trim()) { setErrorMsg('Please enter a description.'); return; }
    setPosting(true); setErrorMsg('');
    try {
      const res = await fetch(`${API}/api/collab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ skillNeeded, projectType, description: description.trim(), budget }),
      });
      if (res.ok) {
        setDescription(''); setSkillNeeded(SKILL_LABELS[0]); setProjectType(PROJECT_LABELS[0]);
        setBudget('Free Collaboration'); setShowPostModal(false);
        showToast('✅ Collab request posted!'); fetchRequests();
      } else { const d = await res.json(); setErrorMsg(d.message || 'Failed to post.'); }
    } catch { setErrorMsg('Network error. Try again.'); }
    finally { setPosting(false); }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Delete this collab request?')) return;
    try {
      const res = await fetch(`${API}/api/collab/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { setRequests(prev => prev.filter(r => r._id !== id)); showToast('🗑 Request deleted'); }
      else showToast('❌ Failed to delete');
    } catch { showToast('❌ Network error'); }
  };

  const handleSendRequest = async (req) => {
    if (!token) { navigate('/login'); return; }
    const targetUser = req.author || req.user;
    if (!targetUser?._id) return;
    if (targetUser._id === me?._id) { showToast('⚠️ This is your own request!'); return; }
    const mySkill   = me?.skill || me?.category || 'artist';
    const msgText   = `Hi! Maine aapki collab request dekhi. Main ${mySkill} hoon aur aapke saath kaam karna chahta/chahti hoon. Kya hum connect kar sakte hain?`;
    try {
      await fetch(`${API}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: targetUser._id, text: msgText }),
      });
    } catch {}
    navigate('/messages', { state: { startChat: { _id: targetUser._id, username: targetUser.username } } });
  };

  const filteredRequests = requests.filter(req => {
    const matchSkill   = filterSkill   === 'All' || req.skillNeeded  === filterSkill;
    const matchProject = filterProject === 'All' || req.projectType  === filterProject;
    return matchSkill && matchProject;
  });

  const formatTime = (d) => {
    if (!d) return '';
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="ch-page">

      {/* Global toast */}
      {toast && <div className="ch-toast">{toast}</div>}

      {/* ── HERO HEADER ── */}
      <div className="ch-hero">
        <div className="ch-hero-bg" />
        <div className="ch-hero-content">
          <div className="ch-hero-left">
            <div className="ch-hero-badge">🤝 Collaboration Hub</div>
            <h1 className="ch-hero-title">
              Find Your Perfect<br />
              <span className="ch-hero-accent">Creative Partner</span>
            </h1>
            <p className="ch-hero-desc">
              Connect with singers, producers, poets & more. Build something amazing together!
            </p>
            <div className="ch-hero-btns">
              <button className="ch-btn-primary" onClick={() => token ? setShowPostModal(true) : navigate('/login')}>
                ➕ Post Collab Request
              </button>
              <button className="ch-btn-outline" onClick={() => setActiveTab('feed')}>
                🔍 Browse Creators
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="ch-stats-grid">
            {STATS.map((s, i) => (
              <div key={i} className="ch-stat-card">
                <div className="ch-stat-icon">{s.icon}</div>
                <div className="ch-stat-val">{s.value}</div>
                <div className="ch-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SKILL PILLS ── */}
      <div className="ch-skills-row">
        <div className="ch-skills-label">Filter by Skill:</div>
        <div className="ch-skills-pills">
          <button className={`ch-skill-pill ${filterSkill === 'All' ? 'active' : ''}`} onClick={() => setFilterSkill('All')}>
            🌟 All
          </button>
          {SKILLS.map(s => (
            <button
              key={s.label}
              className={`ch-skill-pill ${filterSkill === s.label ? 'active' : ''}`}
              onClick={() => setFilterSkill(s.label)}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABS + PROJECT FILTER ── */}
      <div className="ch-toolbar">
        <div className="ch-tabs">
          <button className={`ch-tab ${activeTab === 'feed' ? 'active' : ''}`} onClick={() => setActiveTab('feed')}>
            🌐 Browse Requests
          </button>
          {token && (
            <button className={`ch-tab ${activeTab === 'my-requests' ? 'active' : ''}`} onClick={() => setActiveTab('my-requests')}>
              👤 My Requests
            </button>
          )}
        </div>

        {activeTab === 'feed' && (
          <div className="ch-project-filter">
            <span className="ch-filter-label">📂 Project:</span>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="ch-select">
              <option value="All">All Types</option>
              {PROJECT_TYPES.map(p => <option key={p.label} value={p.label}>{p.icon} {p.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── FEED ── */}
      <div className="ch-feed">
        {loading ? (
          <div className="ch-loading">
            <div className="ch-spinner" />
            <span>Finding creators for you...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="ch-empty">
            <div className="ch-empty-icon">🎵</div>
            <h3>No collab requests yet!</h3>
            <p>Be the first to post and find your creative partner.</p>
            <button className="ch-btn-primary" style={{ marginTop: 16 }}
              onClick={() => token ? setShowPostModal(true) : navigate('/login')}
            >
              ➕ Post First Request
            </button>
          </div>
        ) : (
          <div className="ch-grid">
            {filteredRequests.map(req => {
              const uploader = req.author || req.user || {};
              const isMine   = uploader._id === me?._id;
              return (
                <div key={req._id} className={`ch-card ${isMine ? 'ch-card-mine' : ''}`}>

                  {/* Card top accent */}
                  <div className="ch-card-accent" />

                  {/* Header */}
                  <div className="ch-card-header">
                    <div className="ch-user-row">
                      <div className="ch-avatar">
                        {uploader.profilePic
                          ? <img src={uploader.profilePic} alt={uploader.username} />
                          : uploader.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="ch-user-info">
                        <div className="ch-username">{uploader.username || 'Creator'}</div>
                        <div className="ch-time">🕐 {formatTime(req.createdAt)}</div>
                      </div>
                    </div>
                    {isMine && (
                      <button className="ch-delete-btn" onClick={() => handleDeleteRequest(req._id)} title="Delete">
                        🗑
                      </button>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="ch-badges">
                    <span className="ch-badge ch-badge-skill">
                      {getSkillIcon(req.skillNeeded)} {req.skillNeeded}
                    </span>
                    <span className="ch-badge ch-badge-project">
                      {getProjectIcon(req.projectType)} {req.projectType}
                    </span>
                    <span className={`ch-badge ch-badge-budget ${req.budget === 'Paid' ? 'paid' : 'free'}`}>
                      {req.budget === 'Paid' ? '💰 Paid' : '🤝 Free'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="ch-desc">{req.description}</p>

                  {/* Footer */}
                  <div className="ch-card-footer">
                    {!isMine ? (
                      <button className="ch-connect-btn" onClick={() => handleSendRequest(req)}>
                        ✉️ Send Request
                      </button>
                    ) : (
                      <div className="ch-own-tag">✅ Your Request</div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── POST MODAL ── */}
      {showPostModal && (
        <div className="ch-modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="ch-modal" onClick={e => e.stopPropagation()}>

            <div className="ch-modal-header">
              <div>
                <h2>🤝 Post Collab Request</h2>
                <p>Tell creators what you need</p>
              </div>
              <button className="ch-modal-close" onClick={() => setShowPostModal(false)}>✕</button>
            </div>

            <form onSubmit={handlePostSubmit} className="ch-form">
              {errorMsg && <div className="ch-error">{errorMsg}</div>}

              <div className="ch-form-row">
                <div className="ch-form-group">
                  <label>🎤 Skill Needed</label>
                  <select value={skillNeeded} onChange={e => setSkillNeeded(e.target.value)}>
                    {SKILLS.map(s => <option key={s.label} value={s.label}>{s.icon} {s.label}</option>)}
                  </select>
                </div>
                <div className="ch-form-group">
                  <label>📂 Project Type</label>
                  <select value={projectType} onChange={e => setProjectType(e.target.value)}>
                    {PROJECT_TYPES.map(p => <option key={p.label} value={p.label}>{p.icon} {p.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="ch-form-group">
                <label>💰 Compensation</label>
                <div className="ch-budget-pills">
                  {['Free Collaboration', 'Paid'].map(b => (
                    <button
                      key={b} type="button"
                      className={`ch-budget-pill ${budget === b ? 'active' : ''}`}
                      onClick={() => setBudget(b)}
                    >
                      {b === 'Paid' ? '💰 Paid Project' : '🤝 Free Collaboration'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ch-form-group">
                <label>📝 Project Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe your project, ideas, reference tracks, timeline..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={1000}
                  required
                />
                <span className="ch-char-count">{description.length}/1000</span>
              </div>

              <div className="ch-form-actions">
                <button type="button" className="ch-btn-secondary" onClick={() => setShowPostModal(false)} disabled={posting}>
                  Cancel
                </button>
                <button type="submit" className="ch-btn-primary" disabled={posting}>
                  {posting ? '⏳ Posting...' : '🚀 Post Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}