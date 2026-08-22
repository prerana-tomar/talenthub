import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { User, FolderUp, MessageCircle, Bookmark, ClipboardList, Settings, LogOut, Home, Compass, Upload, Film, Heart, UserPlus, Trophy, BellOff } from 'lucide-react';
import API from '../config';
import { io } from 'socket.io-client';
import { LogoRefContext } from '../App';
import logo from '../assets/logo.jpg';
import './Navbar.css';

function Navbar() {
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activePage, setActivePage]     = useState('');
  const searchRef  = useRef(null);
  const dropdownRef = useRef(null);
  const searchWrapRef = useRef(null);
  const navigate   = useNavigate();
  const { registerLogoNode } = useContext(LogoRefContext);

  // Notification States
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifDropdownRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(() => {
    return JSON.parse(localStorage.getItem('th_user') || 'null');
  });

  useEffect(() => {
    const handleStorage = () => {
      setCurrentUser(JSON.parse(localStorage.getItem('th_user') || 'null'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('th_token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAllRead = async (e) => {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('th_token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    const token = localStorage.getItem('th_token');
    if (!token) return;
    try {
      await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (n) => {
    setNotifDropdownOpen(false);
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

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // 10s fallback polling

      let socket;
      try {
        socket = io(API, { transports: ['websocket'] });
        socket.on('connect', () => {
          socket.emit('join-notifications', { userId: currentUser._id || currentUser.id });
        });
        socket.on('new_notification', (newNotif) => {
          setNotifications(prev => {
            if (prev.some(n => n._id === newNotif._id)) return prev;
            return [newNotif, ...prev];
          });
          setUnreadCount(prev => prev + 1);
        });
      } catch (err) {
        console.error('Socket connection failed in Navbar:', err);
      }

      return () => {
        clearInterval(interval);
        if (socket) socket.disconnect();
      };
    }
  }, [currentUser]);

  // Set active page on load
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/')                  setActivePage('home');
    else if (path.includes('explore')) setActivePage('explore');
    else if (path.includes('upload'))  setActivePage('upload');
    else if (path.includes('competi')) setActivePage('compete');
    else if (path.includes('profile')) setActivePage('profile');
    else if (path.includes('thought')) setActivePage('thoughts');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('th_token');
    localStorage.removeItem('th_user');
    setDropdownOpen(false);
    setNotifDropdownOpen(false);
    navigate('/login');
    window.location.reload();
  };

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setDropdownOpen(false);
        setNotifDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API}/api/videos/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.slice(0, 6));
      }
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleResultClick = (id) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    navigate(`/video/${id}`);
  };

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const getNotifIconAndClass = (type) => {
    switch (type) {
      case 'like':
      case 'reaction':
        return { icon: <Heart size={9} fill="currentColor" />, className: 'notif-badge-like' };
      case 'comment':
        return { icon: <MessageCircle size={9} fill="currentColor" />, className: 'notif-badge-comment' };
      case 'follow':
        return { icon: <UserPlus size={9} />, className: 'notif-badge-follow' };
      case 'competition':
      case 'winner':
      case 'trophy':
        return { icon: <Trophy size={9} />, className: 'notif-badge-trophy' };
      default:
        return { icon: <MessageCircle size={9} fill="currentColor" />, className: 'notif-badge-default' };
    }
  };

  const getGroupedNotifications = () => {
    const now = new Date();
    const newNotifs = [];
    const earlierNotifs = [];

    notifications.forEach(n => {
      const created = new Date(n.createdAt);
      const diffHrs = (now - created) / (1000 * 60 * 60);
      if (diffHrs < 24) {
        newNotifs.push(n);
      } else {
        earlierNotifs.push(n);
      }
    });

    return { newNotifs, earlierNotifs };
  };

  const renderNotifItem = (n) => {
    const senderName = n.sender?.username || 'Someone';
    const senderInitial = senderName[0]?.toUpperCase() || 'U';
    const { icon, className } = getNotifIconAndClass(n.type);

    return (
      <div
        key={n._id}
        className={`notif-dropdown-item ${!n.isRead ? 'unread' : ''}`}
        onClick={() => handleNotificationClick(n)}
      >
        <div className="notif-item-avatar-wrapper">
          <div className="notif-item-avatar">
            {n.sender?.profilePic ? (
              <img src={n.sender.profilePic} alt={senderName} className="notif-item-avatar-img" />
            ) : (
              senderInitial
            )}
          </div>
          <div className={`notif-type-badge ${className}`}>
            {icon}
          </div>
        </div>
        <div className="notif-item-content">
          <span className="notif-item-text">
            <strong>{senderName}</strong> {n.message}
          </span>
          <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <nav className="navbar">

        {/* Logo */}
        <Link to="/" className="navbar-brand" onClick={() => setActivePage('home')}>
          <img ref={registerLogoNode} src={logo} alt="Talent Hub" className="brand-logo-img" />
          <span className="brand-talent">TALENT</span>
          <span className="brand-hub">HUB</span>
          <span className="brand-tagline">✦ INDIA'S TALENT STAGE</span>
        </Link>

        {/* Search Bar */}
        <div ref={searchWrapRef} className="navbar-search-wrap">
          <form onSubmit={handleSearchSubmit} className="navbar-search-form">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" className="search-icon-left">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search performers, categories, songs..."
              value={searchQuery}
              onChange={(e) => { handleSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              className="navbar-search-input"
              autoComplete="off"
            />
            {searchQuery && (
              <button type="button" className="navbar-clear-btn"
                onClick={() => { setSearchQuery(''); setSearchResults([]); searchRef.current.focus(); }}>✕</button>
            )}
          </form>

          {searchOpen && (searchResults.length > 0 || searching || (searchQuery.length >= 2 && !searching)) && (
            <div className="navbar-search-dropdown">
              {searching && <div className="dropdown-status"><span className="spin-dot" /> Searching...</div>}
              {!searching && searchResults.map(r => (
                <div key={r._id} className="dropdown-item" onClick={() => handleResultClick(r._id)}>
                  <div className="dropdown-item-icon">▶</div>
                  <div className="dropdown-item-info">
                    <span className="dropdown-item-title">{r.title}</span>
                    <span className="dropdown-item-meta">{r.category} · {(r.views / 1000).toFixed(1)}K views</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
              ))}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="dropdown-status">No results for "{searchQuery}"</div>
              )}
              {searchResults.length > 0 && (
                <button className="dropdown-view-all" onClick={handleSearchSubmit}>
                  View all results for "{searchQuery}" →
                </button>
              )}
              <div className="dropdown-tags">
                <span className="dropdown-tags-label">Popular:</span>
                {['Music', 'Dance', 'Comedy', 'Art', 'Poetry'].map(tag => (
                  <button key={tag} className="dropdown-tag" onClick={() => handleSearch(tag)}>{tag}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nav Links (desktop) */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/"                  className="nav-link" onClick={() => { setMenuOpen(false); setActivePage('home'); }}>Home</Link>
          <Link to="/explore"           className="nav-link" onClick={() => { setMenuOpen(false); setActivePage('explore'); }}>Explore</Link>
          <Link to="/collab"            className="nav-link" onClick={() => { setMenuOpen(false); setActivePage('collab'); }}>Collab Hub</Link>
          <Link to="/upload"            className="nav-link" onClick={() => { setMenuOpen(false); setActivePage('upload'); }}>Upload</Link>
          <NavLink to="/highlight-studio" className="nav-link" onClick={() => setMenuOpen(false)}>✦ AI Highlights</NavLink>
          <NavLink to="/video-editor"   className="nav-link" onClick={() => setMenuOpen(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Film size={14} /> Video Editor</NavLink>
          <Link to="/competitions"      className="nav-link" onClick={() => { setMenuOpen(false); setActivePage('compete'); }}>
            Competitions <span className="nav-badge">New</span>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="navbar-actions">
          <div className="navbar-notif-wrap" ref={notifDropdownRef}>
            <button className="icon-btn" aria-label="Notifications" onClick={() => {
              if (!currentUser) { navigate('/login'); }
              else { setNotifDropdownOpen(!notifDropdownOpen); }
            }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {notifDropdownOpen && (
              <div className="navbar-notif-dropdown">
                <div className="notif-dropdown-header">
                  <span className="notif-dropdown-title">Notifications</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    {unreadCount > 0 && (
                      <button className="notif-mark-all-btn" onClick={markAllRead}>Mark all read</button>
                    )}
                    <button
                      className="notif-settings-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotifDropdownOpen(false);
                        navigate('/settings');
                      }}
                      title="Notification Settings"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                </div>
                <div className="notif-dropdown-list">
                  {notifications.length === 0 ? (
                    <div className="notif-dropdown-empty">
                      <div className="notif-empty-icon-wrap">
                        <BellOff size={18} />
                      </div>
                      <span className="notif-empty-title">You're all caught up!</span>
                      <span className="notif-empty-subtitle">No new notifications.</span>
                    </div>
                  ) : (
                    (() => {
                      const { newNotifs, earlierNotifs } = getGroupedNotifications();
                      return (
                        <>
                          {newNotifs.length > 0 && (
                            <div className="notif-group">
                              <div className="notif-group-header">New</div>
                              {newNotifs.map(n => renderNotifItem(n))}
                            </div>
                          )}
                          {earlierNotifs.length > 0 && (
                            <div className="notif-group">
                              <div className="notif-group-header">Earlier</div>
                              {earlierNotifs.map(n => renderNotifItem(n))}
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
                <div className="notif-dropdown-footer">
                  <Link to="/notifications" className="notif-view-all-btn" onClick={() => setNotifDropdownOpen(false)}>
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <button className="icon-btn" aria-label="Messages" onClick={() => navigate('/messages')}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {currentUser ? (
            <div className="navbar-user-wrap" ref={dropdownRef}>
              <button className="navbar-avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                {currentUser.profilePic ? (
                  <img src={currentUser.profilePic} alt={currentUser.username} className="navbar-avatar-img" />
                ) : (
                  <div className="navbar-avatar">{currentUser.username?.[0]?.toUpperCase() || 'U'}</div>
                )}
                <span className="navbar-username">{currentUser.username}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="navbar-dropdown">
                  <div className="navbar-dropdown-header">
                    {currentUser.profilePic ? (
                      <img src={currentUser.profilePic} alt={currentUser.username} className="navbar-dropdown-avatar-img" />
                    ) : (
                      <div className="navbar-dropdown-avatar">{currentUser.username?.[0]?.toUpperCase() || 'U'}</div>
                    )}
                    <div>
                      <div className="navbar-dropdown-name">{currentUser.username}</div>
                      <div className="navbar-dropdown-email">{currentUser.email}</div>
                    </div>
                  </div>
                  <div className="navbar-dropdown-divider" />
                  <button className="navbar-dropdown-item" onClick={() => { navigate('/profile');  setDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> My Profile</button>
                  <button className="navbar-dropdown-item" onClick={() => { navigate('/uploads');  setDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FolderUp size={14} /> My Uploads</button>
                  <button className="navbar-dropdown-item" onClick={() => { navigate('/thoughts'); setDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MessageCircle size={14} /> Thoughts</button>
                  <button className="navbar-dropdown-item" onClick={() => { navigate('/saved');    setDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bookmark size={14} /> Saved</button>
                  <button className="navbar-dropdown-item" onClick={() => { navigate('/my-requests'); setDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={14} /> My Requests</button>
                  <button className="navbar-dropdown-item" onClick={() => { navigate('/settings'); setDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={14} /> Settings</button>
                  <div className="navbar-dropdown-divider" />
                  <button className="navbar-dropdown-item navbar-dropdown-logout" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LogOut size={14} /> Logout</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-login">Login</Link>
          )}

          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Backdrops */}
      {dropdownOpen && (
        <div className="search-backdrop" onClick={() => setDropdownOpen(false)} />
      )}

      {/* ✅ MOBILE BOTTOM NAV — Explore, Thoughts jaise sabhi pages pe dikhega */}
      <nav className="nb-bottom-nav">
        <div className="nb-bottom-nav-inner">

          <Link to="/"
            className={`nb-nav-btn ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => setActivePage('home')}
          >
            <span className="nb-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Home size={18} /></span>
            <span className="nb-label">Home</span>
          </Link>

          <Link to="/explore"
            className={`nb-nav-btn ${activePage === 'explore' ? 'active' : ''}`}
            onClick={() => setActivePage('explore')}
          >
            <span className="nb-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Compass size={18} /></span>
            <span className="nb-label">Explore</span>
          </Link>

          <Link to="/upload" className="nb-nav-btn nb-upload" onClick={() => setActivePage('upload')}>
            <span className="nb-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Upload size={18} /></span>
            <span className="nb-label">Upload</span>
          </Link>

          <Link to="/thoughts"
            className={`nb-nav-btn ${activePage === 'thoughts' ? 'active' : ''}`}
            onClick={() => setActivePage('thoughts')}
          >
            <span className="nb-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><MessageCircle size={18} /></span>
            <span className="nb-label">Thoughts</span>
          </Link>

          <Link to="/profile"
            className={`nb-nav-btn ${activePage === 'profile' ? 'active' : ''}`}
            onClick={() => setActivePage('profile')}
          >
            <span className="nb-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><User size={18} /></span>
            <span className="nb-label">Profile</span>
          </Link>

        </div>
      </nav>
    </>
  );
}

export default Navbar;