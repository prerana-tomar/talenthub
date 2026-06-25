import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../config';
import './MyRequests.css';

export default function MyRequests() {
  const navigate = useNavigate();
  const token = localStorage.getItem('th_token');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchMyRequests();
  }, [token]);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/help-requests/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data);
      } else {
        setError(data.message || 'Failed to fetch your requests.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-req-page">
      {/* Background Glow */}
      <div className="my-req-glow-1" />
      <div className="my-req-glow-2" />

      <header className="my-req-header">
        <div>
          <h1>My Help Requests</h1>
          <p>Check status and responses of your creative writing submissions</p>
        </div>
        <button className="my-req-new-btn" onClick={() => navigate('/creative-studio')}>
          ✍️ Submit New Request
        </button>
      </header>

      {loading ? (
        <div className="my-req-loading">
          <div className="my-req-spinner" />
          <p>Loading your requests...</p>
        </div>
      ) : error ? (
        <div className="my-req-error-card">
          <p>⚠️ {error}</p>
          <button className="my-req-retry-btn" onClick={fetchMyRequests}>Try Again</button>
        </div>
      ) : requests.length === 0 ? (
        <div className="my-req-empty-card">
          <div className="my-req-empty-icon">📬</div>
          <h2>No Requests Yet</h2>
          <p>Have some incomplete poetry, song, or script? Submit a help request in Creative Studio, and the owner will help you complete it!</p>
          <button className="my-req-submit-now" onClick={() => navigate('/creative-studio')}>
            Go to Creative Studio
          </button>
        </div>
      ) : (
        <div className="my-req-container">
          {/* List Section */}
          <div className="my-req-list-panel">
            <h3 className="panel-title">Your Submissions ({requests.length})</h3>
            <div className="my-req-cards-list">
              {requests.map(r => (
                <div 
                  key={r._id} 
                  className={`my-req-card ${selectedRequest?._id === r._id ? 'active' : ''} ${r.status}`}
                  onClick={() => setSelectedRequest(r)}
                >
                  <div className="my-req-card-top">
                    <span className="my-req-type-tag">{r.type}</span>
                    <span className={`my-req-status-badge ${r.status}`}>
                      {r.status === 'pending' ? '⏳ Pending' : '✅ Resolved'}
                    </span>
                  </div>
                  <p className="my-req-card-preview">"{r.writing.slice(0, 65)}..."</p>
                  <div className="my-req-card-bottom">
                    <span>Mood: {r.mood}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Details Section */}
          <div className="my-req-details-panel">
            {selectedRequest ? (
              <div className="my-req-details-card">
                <div className="details-card-header">
                  <h3>Request Detail</h3>
                  <span className={`my-req-status-badge ${selectedRequest.status}`}>
                    {selectedRequest.status === 'pending' ? '⏳ Pending Review' : '✅ Resolved by Owner'}
                  </span>
                </div>

                <div className="details-meta-row">
                  <span>Type: <strong>{selectedRequest.type}</strong></span>
                  <span>Language: <strong>{selectedRequest.language}</strong></span>
                  <span>Mood: <strong>{selectedRequest.mood}</strong></span>
                  <span>Submitted: <strong>{new Date(selectedRequest.createdAt).toLocaleDateString()}</strong></span>
                </div>

                <div className="details-content-box">
                  <h4>📝 Your Incomplete Writing:</h4>
                  <div className="details-text-bubble">{selectedRequest.writing}</div>
                </div>

                {selectedRequest.context && (
                  <div className="details-content-box">
                    <h4>💡 Instructions / Context:</h4>
                    <div className="details-text-bubble context">{selectedRequest.context}</div>
                  </div>
                )}

                <div className="details-divider" />

                <div className="details-content-box response-section">
                  <h4>💬 Owner Response:</h4>
                  {selectedRequest.status === 'resolved' ? (
                    <div className="details-text-bubble response-bubble">
                      {selectedRequest.response}
                    </div>
                  ) : (
                    <div className="details-pending-bubble">
                      <div className="details-pending-icon">⏳</div>
                      <p>Owner is working on your request. Please check back soon!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="my-req-placeholder-card">
                <div className="placeholder-icon">📬</div>
                <h3>Select a Request</h3>
                <p>Click on any request in the left panel to view its full details and see the owner's response.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
