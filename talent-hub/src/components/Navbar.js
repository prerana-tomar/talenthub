import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { NavLink } from 'react-router-dom';

function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`http://localhost:5000/api/videos/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.slice(0, 6));
      }
    } catch {
      setSearchResults([
        { _id: '1', title: 'Neon Nights Performance', category: 'Music', views: 98000 },
        { _id: '2', title: 'Dance Battle 2024', category: 'Dance', views: 45000 },
      ].filter(r => r.title.toLowerCase().includes(query.toLowerCase())));
    }
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

  return (
    <>
      <nav className="navbar">

        {/* Logo */}
        <Link to="/" className="navbar-brand">
          <span className="brand-talent">TALENT</span>
          <span className="brand-hub">HUB</span>
          <span className="brand-tagline">✦ INDIA'S TALENT STAGE</span>
        </Link>

        {/* Search Bar — inline navbar mein */}
        <div className="navbar-search-wrap">
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
              <button
                type="button"
                className="navbar-clear-btn"
                onClick={() => { setSearchQuery(''); setSearchResults([]); searchRef.current.focus(); }}
              >✕</button>
            )}
          </form>

          {/* Search Dropdown */}
          {searchOpen && (searchResults.length > 0 || searching || (searchQuery.length >= 2 && !searching)) && (
            <div className="navbar-search-dropdown">
              {searching && (
                <div className="dropdown-status">
                  <span className="spin-dot" /> Searching...
                </div>
              )}
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

        {/* Nav Links */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/explore" className="nav-link" onClick={() => setMenuOpen(false)}>Explore</Link>
          <Link to="/upload" className="nav-link" onClick={() => setMenuOpen(false)}>Upload</Link>
          <NavLink to="/highlight-studio" className="nav-link" onClick={() => setMenuOpen(false)}>✦ AI Highlights</NavLink>

          <Link to="/competitions" className="nav-link" onClick={() => setMenuOpen(false)}>
            Competitions <span className="nav-badge">New</span>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="navbar-actions">
          <button className="icon-btn" aria-label="Notifications">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="notif-dot" />
          </button>

          <button className="icon-btn" aria-label="Messages">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          <Link to="/login" className="btn-login">Login</Link>

          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Backdrop — dropdown band karne ke liye */}
      {searchOpen && (
        <div
          className="search-backdrop"
          onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
        />
      )}
    </>
  );
}

export default Navbar;