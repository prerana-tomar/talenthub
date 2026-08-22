import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Trash2, Heart, MessageCircle, UserPlus, Trophy, BellOff,
  CheckSquare, RefreshCw, Loader2
} from 'lucide-react';
import API from '../config';
import './Notifications.css';

export default function Notifications() {
  const navigate = useNavigate();
  const token = localStorage.getItem('th_token');

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const limit = 15;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchNotifications(1, activeFilter, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const fetchNotifications = async (pageNum, filterType, isFresh = false) => {
    if (isFresh) {
      setLoading(true);
      setError(false);
    } else {
      setLoadingMore(true);
    }

    try {
      let typeQuery = '';
      if (filterType !== 'all') {
        typeQuery = filterType;
      }

      const res = await fetch(`${API}/api/notifications?page=${pageNum}&limit=${limit}&type=${typeQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (isFresh) {
          setNotifications(data);
        } else {
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n._id));
            const uniqueNew = data.filter(n => !existingIds.has(n._id));
            return [...prev, ...uniqueNew];
          });
        }
        setPage(pageNum);
        setHasMore(data.length === limit);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
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
    } finally {
      setMarkingAll(false);
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
    e.stopPropagation();
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

  const handleRetry = () => {
    fetchNotifications(1, activeFilter, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNotifications(page + 1, activeFilter, false);
    }
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

  const getNotifIconAndClass = (type) => {
    switch (type) {
      case 'like':
      case 'reaction':
        return { icon: <Heart size={10} fill="currentColor" />, className: 'nt-badge-like' };
      case 'comment':
        return { icon: <MessageCircle size={10} fill="currentColor" />, className: 'nt-badge-comment' };
      case 'follow':
        return { icon: <UserPlus size={10} />, className: 'nt-badge-follow' };
      case 'competition_win':
      case 'competition_join':
      case 'trophy':
        return { icon: <Trophy size={10} />, className: 'nt-badge-trophy' };
      default:
        return { icon: <MessageCircle size={10} fill="currentColor" />, className: 'nt-badge-default' };
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const FILTER_TABS = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'unread', label: 'Unread', icon: BellOff },
    { id: 'like', label: 'Likes', icon: Heart },
    { id: 'comment', label: 'Comments', icon: MessageCircle },
    { id: 'follow', label: 'Follows', icon: UserPlus }
  ];

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
          <button className="nt-read-all-btn" onClick={markAllRead} disabled={markingAll}>
            {markingAll ? <Loader2 size={12} className="nt-spinner" /> : <CheckSquare size={12} />}
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="nt-tabs">
        {FILTER_TABS.map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`nt-tab-btn ${activeFilter === tab.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              <TabIcon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="nt-list-skeleton">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="nt-skeleton-card">
              <div className="nt-skeleton-avatar" />
              <div className="nt-skeleton-info">
                <div className="nt-skeleton-text" />
                <div className="nt-skeleton-time" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="nt-error-state">
          <div className="nt-error-icon">⚠️</div>
          <h3>Failed to load notifications</h3>
          <p>Please check your connection and try again.</p>
          <button className="nt-retry-btn" onClick={handleRetry}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="nt-empty">
          <div className="nt-empty-icon">
            <BellOff size={32} />
          </div>
          <h3>You're all caught up!</h3>
          <p>No notifications found in this category.</p>
          <button className="nt-explore-btn" onClick={() => navigate('/explore')}>
            Explore Feed
          </button>
        </div>
      ) : (
        <div className="nt-list-container">
          <div className="nt-list">
            {notifications.map(n => {
              const senderName = n.sender?.username || 'Someone';
              const senderInitial = senderName[0]?.toUpperCase() || 'U';
              const { icon, className } = getNotifIconAndClass(n.type);

              return (
                <div
                  key={n._id}
                  className={`nt-card ${!n.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="nt-card-avatar-wrapper">
                    <div className="nt-card-avatar">
                      {n.sender?.profilePic ? (
                        <img src={n.sender.profilePic} alt={senderName} className="nt-card-avatar-img" />
                      ) : (
                        senderInitial
                      )}
                    </div>
                    <div className={`nt-card-type-badge ${className}`}>
                      {icon}
                    </div>
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
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="nt-loadmore-wrap">
              <button
                className="nt-loadmore-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={13} className="nt-spinner" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
