import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../config';
import './CollabHub.css';

const SKILLS = [
  'Singer',
  'Lyricist',
  'Composer',
  'Rapper',
  'Music Producer',
  'Poet',
  'Voice Artist',
  'Instrumentalist'
];

const PROJECT_TYPES = [
  'Song',
  'Album',
  'Jingle',
  'Podcast',
  'Short Film',
  'Stage Performance'
];

export default function CollabHub() {
  const navigate = useNavigate();
  const token = localStorage.getItem('th_token');
  const me = JSON.parse(localStorage.getItem('th_user') || 'null');

  // Tabs: 'feed' or 'my-requests'
  const [activeTab, setActiveTab] = useState('feed');

  // Filter states
  const [filterSkill, setFilterSkill] = useState('All');
  const [filterProject, setFilterProject] = useState('All');

  // Requests states
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showPostModal, setShowPostModal] = useState(false);
  const [skillNeeded, setSkillNeeded] = useState(SKILLS[0]);
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('Free Collaboration');
  const [posting, setPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch requests based on active tab
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'feed' ? `${API}/api/collab` : `${API}/api/collab/mine`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      } else {
        setRequests([]);
      }
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  // Handle post request submission
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a description for your collaboration project.');
      return;
    }

    setPosting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/api/collab`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          skillNeeded,
          projectType,
          description: description.trim(),
          budget
        })
      });

      if (res.ok) {
        // Clear form and close modal
        setDescription('');
        setSkillNeeded(SKILLS[0]);
        setProjectType(PROJECT_TYPES[0]);
        setBudget('Free Collaboration');
        setShowPostModal(false);
        // Refresh requests
        fetchRequests();
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'Failed to post collaboration request.');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  // Handle deletion of own request
  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this collab request?')) return;
    try {
      const res = await fetch(`${API}/api/collab/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r._id !== id));
      } else {
        alert('Failed to delete request.');
      }
    } catch {
      alert('Network error.');
    }
  };

  // Handle Send Request (message generation & redirection)
  const handleSendRequest = async (req) => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    const targetUser = req.author || req.user;
    if (!targetUser || !targetUser._id) return;

    // Prevent collaborating with oneself
    if (targetUser._id === me?._id) {
      alert('This is your own collaboration request!');
      return;
    }

    const mySkill = me?.skill || me?.category || 'artist';
    const messageText = `Hi! Maine aapki collab request dekhi. Main ${mySkill} hoon aur aapke saath kaam karna chahta/chahti hoon. Kya hum connect kar sakte hain?`;

    try {
      // Post direct message via socket/REST fallback API
      const res = await fetch(`${API}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: targetUser._id,
          text: messageText
        })
      });

      if (res.ok) {
        // Redirect to messages page to view the conversation
        navigate('/messages', {
          state: {
            startChat: {
              _id: targetUser._id,
              username: targetUser.username
            }
          }
        });
      } else {
        alert('Failed to initiate conversation. Opening chat fallback.');
        navigate('/messages', {
          state: {
            startChat: {
              _id: targetUser._id,
              username: targetUser.username
            }
          }
        });
      }
    } catch {
      // Fallback redirect
      navigate('/messages', {
        state: {
          startChat: {
            _id: targetUser._id,
            username: targetUser.username
          }
        }
      });
    }
  };

  // Filter requests locally
  const filteredRequests = requests.filter(req => {
    const matchesSkill = filterSkill === 'All' || req.skillNeeded === filterSkill;
    const matchesProject = filterProject === 'All' || req.projectType === filterProject;
    return matchesSkill && matchesProject;
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
    <div className="collab-hub">
      <div className="collab-header-section">
        <div className="collab-header-content">
          <h1>🤝 Collaboration Hub</h1>
          <p>Connect with other creators, share skills, and build amazing projects together.</p>
        </div>
        <button className="collab-post-trigger" onClick={() => token ? setShowPostModal(true) : navigate('/login')}>
          ➕ Post Collab Request
        </button>
      </div>

      {/* Tabs */}
      <div className="collab-tabs">
        <button 
          className={`collab-tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          Browse Requests
        </button>
        {token && (
          <button 
            className={`collab-tab ${activeTab === 'my-requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-requests')}
          >
            My Requests
          </button>
        )}
      </div>

      {/* Filters (only visible on Browse Feed tab) */}
      {activeTab === 'feed' && (
        <div className="collab-filters">
          <div className="collab-filter-item">
            <label htmlFor="filter-skill-select">Required Skill:</label>
            <select 
              id="filter-skill-select"
              value={filterSkill} 
              onChange={e => setFilterSkill(e.target.value)}
            >
              <option value="All">All Skills</option>
              {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="collab-filter-item">
            <label htmlFor="filter-project-select">Project Type:</label>
            <select 
              id="filter-project-select"
              value={filterProject} 
              onChange={e => setFilterProject(e.target.value)}
            >
              <option value="All">All Projects</option>
              {PROJECT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Requests Feed Container */}
      <div className="collab-feed">
        {loading ? (
          <div className="collab-loading">
            <div className="collab-spinner" />
            <span>Loading collaboration requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="collab-empty">
            <div className="collab-empty-icon">🤝</div>
            <h3>No requests found</h3>
            <p>Be the first to post a collaboration request for your next creative project!</p>
            {activeTab === 'feed' && (
              <button className="collab-post-trigger" style={{ marginTop: 16 }} onClick={() => token ? setShowPostModal(true) : navigate('/login')}>
                Post Request Now
              </button>
            )}
          </div>
        ) : (
          <div className="collab-grid">
            {filteredRequests.map(req => {
              const uploader = req.author || req.user || {};
              const isMine = uploader._id === me?._id;
              
              return (
                <div key={req._id} className="collab-card">
                  <div className="collab-card-header">
                    <div className="collab-user-info">
                      <div className="collab-avatar">
                        {uploader.profilePic ? (
                          <img src={uploader.profilePic} alt={uploader.username} className="collab-avatar-img" />
                        ) : (
                          uploader.username?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <div>
                        <div className="collab-username">{uploader.username || 'Creator'}</div>
                        <div className="collab-time">{formatTime(req.createdAt)}</div>
                      </div>
                    </div>
                    {isMine && activeTab === 'my-requests' && (
                      <button className="collab-delete-btn" onClick={() => handleDeleteRequest(req._id)} title="Delete request">
                        🗑
                      </button>
                    )}
                  </div>

                  <div className="collab-badges">
                    <span className="collab-badge skill-badge">🎯 {req.skillNeeded}</span>
                    <span className="collab-badge project-badge">📂 {req.projectType}</span>
                    <span className={`collab-badge budget-badge ${req.budget === 'Paid' ? 'paid' : 'free'}`}>
                      💰 {req.budget}
                    </span>
                  </div>

                  <p className="collab-description">{req.description}</p>

                  <div className="collab-card-footer">
                    {!isMine ? (
                      <button className="collab-action-btn" onClick={() => handleSendRequest(req)}>
                        ✉ Send Request
                      </button>
                    ) : (
                      <span className="collab-own-tag">Your Request</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post Modal Form */}
      {showPostModal && (
        <div className="collab-modal-overlay" onClick={() => setShowPostModal(false)}>
          <div className="collab-modal" onClick={e => e.stopPropagation()}>
            <div className="collab-modal-header">
              <h2>Post Collab Request</h2>
              <button className="collab-modal-close" onClick={() => setShowPostModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handlePostSubmit} className="collab-form">
              {errorMsg && <div className="collab-error-alert">{errorMsg}</div>}

              <div className="collab-form-group">
                <label htmlFor="form-skill-select">Skill Needed:</label>
                <select 
                  id="form-skill-select"
                  value={skillNeeded} 
                  onChange={e => setSkillNeeded(e.target.value)}
                >
                  {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="collab-form-group">
                <label htmlFor="form-project-select">Project Type:</label>
                <select 
                  id="form-project-select"
                  value={projectType} 
                  onChange={e => setProjectType(e.target.value)}
                >
                  {PROJECT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="collab-form-group">
                <label htmlFor="form-budget-select">Compensation / Budget:</label>
                <select 
                  id="form-budget-select"
                  value={budget} 
                  onChange={e => setBudget(e.target.value)}
                >
                  <option value="Free Collaboration">Free Collaboration</option>
                  <option value="Paid">Paid Project</option>
                </select>
              </div>

              <div className="collab-form-group">
                <label htmlFor="form-desc-textarea">Project Description:</label>
                <textarea
                  id="form-desc-textarea"
                  rows={4}
                  placeholder="Describe your project, reference tracks, ideas, and what kind of collaboration you want..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={1000}
                  required
                />
              </div>

              <div className="collab-form-actions">
                <button type="button" className="collab-btn-secondary" onClick={() => setShowPostModal(false)} disabled={posting}>
                  Cancel
                </button>
                <button type="submit" className="collab-btn-primary" disabled={posting}>
                  {posting ? 'Posting...' : 'Post Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
