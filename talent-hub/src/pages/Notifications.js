import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../config';
import './Notifications.css';

export default function Notifications() {
  const navigate = useNavigate();
  const token = localStorage.getItem('th_token');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const markAllRead = async () => {
    try {
      const res = await fetch(`${API}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        showToast('✅ All notifications marked as read');
      }
    } catch {
      showToast('❌ Failed to mark all read');
    }
  };

  const markAsRead = async (id) => {
    try {
      const res = await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation(); // Avoid triggering list item click
    try {
      const res = await fetch(`${API}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== id));
        showToast('🗑 Notification deleted');
      }
    } catch {
      showToast('❌ Failed to delete notification');
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await markAsRead(n._id);
    }
    navigate(n.link);
  };

  const timeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const ms = now - past;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="nt-page">
      {toast && <div className="nt-toast">{toast}</div>}

      {/* Header */}
      <div className="nt-header">
        <div className="nt-header-left">
          <h1 className="nt-title">🔔 Notifications</h1>
          <p className="nt-sub">Manage and view your activities</p>
        </div>
        {unreadCount > 0 && (
          <button className="nt-read-all-btn" onClick={markAllRead}>
            ✓ Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="nt-list-skeleton">
          {[1, 2, 3, 4].map(i => <div key={i} className="nt-skeleton-card" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="nt-empty">
          <div className="nt-empty-icon">🔔</div>
          <h3>No notifications yet</h3>
          <p>We'll notify you when someone interacts with your uploads or profile.</p>
          <button className="nt-explore-btn" onClick={() => navigate('/explore')}>
            🔍 Explore Feed
          </button>
        </div>
      ) : (
        <div className="nt-list">
          {notifications.map(n => {
            const senderName = n.sender?.username || 'Someone';
            const senderInitial = senderName[0]?.toUpperCase() || 'U';
            return (
              <div
                key={n._id}
                className={`nt-card ${!n.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="nt-card-avatar">
                  {senderInitial}
                </div>
                <div className="nt-card-content">
                  <div className="nt-card-text">
                    <strong>{senderName}</strong> {n.message}
                  </div>
                  <div className="nt-card-time">{timeAgo(n.createdAt)}</div>
                </div>
                <button
                  className="nt-delete-btn"
                  onClick={(e) => deleteNotification(n._id, e)}
                  aria-label="Delete notification"
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
