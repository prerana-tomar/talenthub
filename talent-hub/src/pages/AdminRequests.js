import React, { useState, useEffect } from 'react';
import API from '../config';
import './AdminRequests.css';

export default function AdminRequests() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('th_admin_auth') === 'true';
  });
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseVal, setResponseVal] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const expectedPassword = process.env.REACT_APP_ADMIN_PASSWORD || 'admin123';

  // Fetch requests when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchRequests();
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === expectedPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('th_admin_auth', 'true');
      setError('');
    } else {
      setError('Incorrect admin password! Please try again.');
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/help-requests/all`, {
        headers: {
          'x-admin-password': password || expectedPassword
        }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data);
      } else {
        setError(data.message || 'Failed to fetch requests');
      }
    } catch (err) {
      console.error(err);
      setError('Server connection error. Please reload.');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (e) => {
    e.preventDefault();
    if (!responseVal.trim()) {
      setSubmitError('Response text is required!');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`${API}/api/help-requests/${selectedRequest._id}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password || expectedPassword
        },
        body: JSON.stringify({ response: responseVal.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        // Update requests list
        setRequests(prev => prev.map(r => r._id === selectedRequest._id ? data : r));
        setSelectedRequest(data);
        setResponseVal('');
        // Re-fetch to get user details populated
        fetchRequests();
      } else {
        setSubmitError(data.message || 'Failed to submit response');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Error saving response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('th_admin_auth');
    setPassword('');
    setRequests([]);
    setSelectedRequest(null);
  };

  // Password Input Page
  if (!isAuthenticated) {
    return (
      <div className="admin-auth-page">
        <div className="admin-auth-glow" />
        <div className="admin-auth-card">
          <div className="admin-auth-icon">🔑</div>
          <h2>Owner Portal</h2>
          <p>Please enter the admin password to access user requests.</p>
          
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="admin-auth-input"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <div className="admin-auth-error">⚠️ {error}</div>}
            <button type="submit" className="admin-auth-btn">
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status === 'resolved');

  return (
    <div className="admin-req-page">
      <header className="admin-req-header">
        <div>
          <h1>Owner Dashboard</h1>
          <p>Manage and respond to user writing requests ({requests.length} total)</p>
        </div>
        <button className="admin-logout-btn" onClick={handleLogout}>
          🔒 Logout Admin
        </button>
      </header>

      {loading && requests.length === 0 ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
          <p>Loading help requests...</p>
        </div>
      ) : (
        <div className="admin-req-container">
          {/* Requests Lists */}
          <div className="admin-lists-column">
            
            {/* PENDING SECTION */}
            <div className="admin-section-block">
              <h3 className="admin-section-title pending">⏳ Pending Requests ({pendingRequests.length})</h3>
              {pendingRequests.length === 0 ? (
                <div className="admin-empty-section">No pending requests! All caught up. ✨</div>
              ) : (
                <div className="admin-list-grid">
                  {pendingRequests.map(r => (
                    <div 
                      key={r._id} 
                      className={`admin-request-card ${selectedRequest?._id === r._id ? 'active' : ''}`}
                      onClick={() => { setSelectedRequest(r); setResponseVal(''); setSubmitError(''); }}
                    >
                      <div className="admin-req-top">
                        <span className="admin-req-badge">{r.type}</span>
                        <span className="admin-req-time">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="admin-req-author">
                        By: <strong>{r.userId?.username || 'User'}</strong> ({r.userId?.email || 'N/A'})
                      </p>
                      <p className="admin-req-preview">"{r.writing.slice(0, 80)}..."</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RESOLVED SECTION */}
            <div className="admin-section-block">
              <h3 className="admin-section-title resolved">✅ Resolved Requests ({resolvedRequests.length})</h3>
              {resolvedRequests.length === 0 ? (
                <div className="admin-empty-section">No resolved requests yet.</div>
              ) : (
                <div className="admin-list-grid">
                  {resolvedRequests.map(r => (
                    <div 
                      key={r._id} 
                      className={`admin-request-card resolved ${selectedRequest?._id === r._id ? 'active' : ''}`}
                      onClick={() => { setSelectedRequest(r); setResponseVal(r.response); setSubmitError(''); }}
                    >
                      <div className="admin-req-top">
                        <span className="admin-req-badge">{r.type}</span>
                        <span className="admin-req-time">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="admin-req-author">
                        By: <strong>{r.userId?.username || 'User'}</strong>
                      </p>
                      <p className="admin-req-preview">"{r.writing.slice(0, 80)}..."</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Response Panel */}
          <div className="admin-detail-column">
            {selectedRequest ? (
              <div className="admin-detail-card">
                <div className="admin-detail-header">
                  <h3>Request Details</h3>
                  <span className={`status-pill ${selectedRequest.status}`}>
                    {selectedRequest.status === 'pending' ? '⏳ Pending' : '✅ Resolved'}
                  </span>
                </div>

                <div className="admin-detail-meta-grid">
                  <div><strong>From:</strong> {selectedRequest.userId?.username || 'User'} ({selectedRequest.userId?.email || 'N/A'})</div>
                  <div><strong>Type:</strong> {selectedRequest.type}</div>
                  <div><strong>Language:</strong> {selectedRequest.language}</div>
                  <div><strong>Mood/Vibe:</strong> {selectedRequest.mood}</div>
                </div>

                <div className="admin-detail-section">
                  <h4>📝 Incomplete Writing:</h4>
                  <div className="admin-text-box">{selectedRequest.writing}</div>
                </div>

                {selectedRequest.context && (
                  <div className="admin-detail-section">
                    <h4>💡 User Instructions/Context:</h4>
                    <div className="admin-text-box context">{selectedRequest.context}</div>
                  </div>
                )}

                <div className="admin-divider" />

                {/* Response Form */}
                <form className="admin-response-form" onSubmit={handleRespond}>
                  <label htmlFor="response-textarea">
                    {selectedRequest.status === 'pending' ? '✍️ Type Your Response/Completion:' : '✏️ Update Your Response:'}
                  </label>
                  <textarea
                    id="response-textarea"
                    className="admin-response-textarea"
                    placeholder="Write the completed version of their text, improve it, and add suggestions..."
                    rows="8"
                    value={responseVal}
                    onChange={(e) => setResponseVal(e.target.value)}
                    required
                  />

                  {submitError && <div className="admin-detail-error">⚠️ {submitError}</div>}

                  <button 
                    type="submit" 
                    className="admin-submit-response-btn" 
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : selectedRequest.status === 'pending' ? '✨ Submit & Resolve' : '💾 Update Response'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="admin-detail-placeholder">
                <div className="placeholder-icon">📬</div>
                <h3>No Request Selected</h3>
                <p>Click on any user request in the list to view its details and write a response.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
