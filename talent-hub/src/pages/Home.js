import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import './Home.css';

const CATEGORIES = ['All','Singing','Dance','Rap','Comedy','Acting','Instrumental','Poetry'];

const FALLBACK_COMPETITIONS = [
  { icon:'🎤', name:'Singing Superstar', date:'Coming Soon', color:'#a78bfa', status:'upcoming' },
  { icon:'💃', name:'Dance Battle',      date:'Coming Soon', color:'#f472b6', status:'upcoming' },
  { icon:'🎙', name:'Rap Showdown',      date:'Coming Soon', color:'#34d399', status:'active'   },
];

const NAV_ITEMS = [
  { icon:'🏠', label:'Home',              path:'/' },
  { icon:'🔍', label:'Explore',           path:'/explore' },
  { icon:'📂', label:'Categories',        path:'/categories' },
  { icon:'🔴', label:'Live Performances', path:'/live', live:true },
  { icon:'🏆', label:'Competitions',      path:'/competitions' },
  { icon:'⭐', label:'Top Performers',    path:'/top' },
  { icon:'📊', label:'Leaderboard',       path:'/leaderboard' },
  { icon:'💭', label:'Thoughts',          path:'/thoughts' },
];

const BOTTOM_NAV = [
  { icon:'👤', label:'My Profile',    path:'/profile' },
  { icon:'📤', label:'My Uploads',    path:'/uploads' },
  { icon:'✦',  label:'AI Highlights', path:'/highlight-studio' },
  { icon:'🔖', label:'Saved',         path:'/saved' },
  { icon:'➕', label:'Following',     path:'/following' },
  { icon:'💬', label:'Messages',      path:'/messages' },
  { icon:'⚙️', label:'Settings',      path:'/settings' },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activePage, setActivePage]         = useState('Home');
  const [videos, setVideos]                 = useState([]);
  const [loading, setLoading]               = useState(true);
  const [darkMode, setDarkMode]             = useState(true);
  const [competitions, setCompetitions]     = useState(FALLBACK_COMPETITIONS);

  const [realUserCount, setRealUserCount]   = useState(null);
  const [realStats, setRealStats]           = useState({ users:0, videos:0, views:0 });
  const [topPerformers, setTopPerformers]   = useState([]);
  const [recentThoughts, setRecentThoughts] = useState([]);

  const [searchQuery,   setSearchQuery]     = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [searchOpen,    setSearchOpen]      = useState(false);
  const [searching,     setSearching]       = useState(false);
  const searchRef = useRef(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('th_user') || 'null');

  const API = 'https://talenthub-w1cc.onrender.com';

  useEffect(() => {
    fetch(`${API}/api/auth/count`)
      .then(r => r.json())
      .then(d => { setRealUserCount(d.count); setRealStats(prev => ({ ...prev, users: d.count })); })
      .catch(() => setRealUserCount(null));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/videos`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const totalViews = data.reduce((sum, v) => sum + (v.views || 0), 0);
          setRealStats(prev => ({ ...prev, videos: data.length, views: totalViews }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/api/auth/top-performers`)
      .then(r => r.json())
      .then(d => setTopPerformers(Array.isArray(d) ? d : []))
      .catch(() => setTopPerformers([]));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/thoughts?limit=3`)
      .then(r => r.json())
      .then(d => setRecentThoughts(d.thoughts || d || []))
      .catch(() => setRecentThoughts([]));
  }, []);

  useEffect(() => {
    fetch(`${API}/api/competitions`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0)
          setCompetitions(data.filter(c => c.status !== 'ended').slice(0, 3));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const url = activeCategory === 'All'
          ? `${API}/api/videos`
          : `${API}/api/videos?category=${activeCategory}`;
        const res  = await fetch(url);
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : []);
      } catch { setVideos([]); }
      finally  { setLoading(false); }
    };
    fetchVideos();
  }, [activeCategory]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API}/api/videos/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.videos ? data.videos.slice(0, 6) : data.slice(0, 6));
      }
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery(''); setSearchResults([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('th_token');
    localStorage.removeItem('th_user');
    navigate('/login');
    window.location.reload();
  };

  const fmt = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000)    return `${(num / 1000).toFixed(1)}K+`;
    return num.toString();
  };

  const formatTime = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={`th-app${darkMode ? '' : ' light-mode'}`}>

      {/* ══ SIDEBAR ══ */}
      <aside className="th-sidebar">
        <div className="th-sidebar-logo" onClick={() => navigate('/')}>
          <span className="th-logo-text">TALENT<span className="th-logo-accent">HUB</span></span>
          <span className="th-logo-sub">India's Talent Stage</span>
        </div>

        <button className="th-upload-btn" onClick={() => navigate('/upload')}>
          <span>⬆</span> Upload Performance
        </button>

        <nav className="th-sidenav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.label}
              to={item.path}
              className={`th-sidenav-item${activePage === item.label ? ' active' : ''}`}
              onClick={() => setActivePage(item.label)}
            >
              <span className="th-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.live && <span className="th-live-pill">LIVE</span>}
            </Link>
          ))}
        </nav>

        <div className="th-sidebar-divider" />

        <nav className="th-sidenav">
          {BOTTOM_NAV.map(item => (
            <Link key={item.label} to={item.path} className="th-sidenav-item">
              <span className="th-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="th-premium-card">
          <div className="th-premium-icon">👑</div>
          <div className="th-premium-text">
            <strong>Go Premium</strong>
            <span>Unlock exclusive features and get more visibility.</span>
          </div>
          <button className="th-premium-btn">Upgrade Now</button>
        </div>

        <div className="th-darkmode-row">
          <span className="th-nav-icon">{darkMode ? '🌙' : '☀️'}</span>
          <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          <div className={`th-toggle${darkMode ? ' on' : ''}`} onClick={() => setDarkMode(d => !d)}>
            <div className="th-toggle-thumb" />
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="th-main">

        {/* TOPBAR */}
        <header className="th-topbar">
          <div className="th-search-wrap">
            <form onSubmit={handleSearchSubmit} className="th-search-form">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search performers, categories, songs..."
                value={searchQuery}
                onChange={(e) => { handleSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                className="th-search-input"
                autoComplete="off"
              />
              {searchQuery && (
                <button type="button" className="th-search-clear"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); searchRef.current?.focus(); }}
                >✕</button>
              )}
            </form>

            {searchOpen && (searchResults.length > 0 || searching || (searchQuery.length >= 2 && !searching)) && (
              <div className="th-search-dropdown">
                {searching && <div className="th-search-status">Searching...</div>}
                {!searching && searchResults.map(r => (
                  <div key={r._id} className="th-search-item"
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); navigate(`/video/${r._id}`); }}
                  >
                    <span className="th-search-item-icon">▶</span>
                    <div className="th-search-item-info">
                      <span className="th-search-item-title">{r.title}</span>
                      <span className="th-search-item-meta">{r.category} · {((r.views||0)/1000).toFixed(1)}K views</span>
                    </div>
                  </div>
                ))}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="th-search-status">No results for "{searchQuery}"</div>
                )}
                {searchResults.length > 0 && (
                  <button className="th-search-view-all" onClick={handleSearchSubmit}>
                    View all results for "{searchQuery}" →
                  </button>
                )}
                <div className="th-search-tags">
                  <span className="th-search-tags-label">Popular:</span>
                  {['Music','Dance','Comedy','Art','Poetry'].map(tag => (
                    <button key={tag} className="th-search-tag" onClick={() => handleSearch(tag)}>{tag}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <nav className="th-topnav">
            {['Home','Explore','Upload','Competitions'].map(link => (
              <Link key={link}
                to={link === 'Home' ? '/' : `/${link.toLowerCase()}`}
                className={`th-topnav-link${activePage === link ? ' active' : ''}`}
                onClick={() => setActivePage(link)}
              >
                {link}
                {link === 'Competitions' && <span className="th-new-badge">NEW</span>}
              </Link>
            ))}
          </nav>

          <div className="th-topbar-right">
            <button className="th-icon-btn" aria-label="Notifications">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="th-notif-dot">3</span>
            </button>

            <button className="th-icon-btn" aria-label="Messages">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>

            {user ? (
              <div className="th-user-pill">
                <div className="th-user-avatar">{user.username?.[0]?.toUpperCase() || 'U'}</div>
                <span className="th-user-name">{user.username}</span>
                <button className="th-logout-btn" onClick={handleLogout}>↩</button>
              </div>
            ) : (
              <Link to="/login" className="th-login-pill">Login</Link>
            )}
          </div>
        </header>

        {/* ══ HERO ══ */}
        <section className="th-hero">
          <div className="th-hero-inner">
            <div className="th-hero-text">
              <div className="th-hero-badge">⭐ INDIA'S TALENT STAGE</div>
              <h1 className="th-hero-title">
                SHOW YOUR<br />
                <span className="th-hero-accent">TALENT</span>
              </h1>
              <p className="th-hero-desc">
                <span className="th-desc-highlight">Show Your Talent. Inspire the World.</span> ✨
                <br /><br />
                Upload videos, grow your audience, earn recognition, and become part of
                <span className="th-desc-highlight"> India's creative talent community.</span>
                <br /><br />
                <span className="th-desc-cta">🚀 Start your journey with TalentHub today!</span>
              </p>
              <div className="th-hero-btns">
                <button className="th-btn-primary" onClick={() => navigate('/upload')}>⬆ Upload Now</button>
                <button className="th-btn-outline" onClick={() => window.scrollTo({top:700,behavior:'smooth'})}>▶ Explore Performances</button>
              </div>
              <div className="th-social-proof">
                <span style={{display:'flex', alignItems:'center', gap:8, fontSize:15}}>
                  <span style={{fontSize:22}}>👥</span>
                  <span>
                    <strong style={{color:'#f5a623'}}>{realUserCount !== null ? realUserCount : '...'}</strong>{' '}
                    performers already shining ✨
                  </span>
                </span>
              </div>
            </div>

            <div className="th-hero-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=90"
                alt="Concert Stage"
                className="th-hero-img"
              />
              <div className="th-hero-img-overlay" />

              {/* ✅ Live card — fake data hataya */}
              <div className="th-live-card">
                <div className="th-live-badge">
                  <span className="th-live-dot" /> LIVE NOW
                </div>
                <div className="th-live-title">India's Talent Stage</div>
                <div className="th-live-by">Live Performances</div>
                <div className="th-live-footer">
                  <button className="th-live-play" onClick={() => navigate('/live')}>▶</button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="th-stats-row">
            {[
              { icon:'👥', val: fmt(realStats.users),  label:'Performers',        accent:'#a855f7', bg:'rgba(168,85,247,0.08)',  border:'rgba(168,85,247,0.25)' },
              { icon:'📹', val: fmt(realStats.videos), label:'Videos',            accent:'#f472b6', bg:'rgba(244,114,182,0.08)', border:'rgba(244,114,182,0.25)' },
              { icon:'👁',  val: fmt(realStats.views),  label:'Views',             accent:'#34d399', bg:'rgba(52,211,153,0.08)',  border:'rgba(52,211,153,0.25)' },
              { icon:'👍', val: '95%',                  label:'Positive Feedback', accent:'#f5a623', bg:'rgba(245,166,35,0.08)',  border:'rgba(245,166,35,0.25)' },
            ].map((s,i) => (
              <div key={i} className="th-stat-box">
                <div className="th-stat-icon-wrap" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <span className="th-stat-icon">{s.icon}</span>
                </div>
                <div className="th-stat-val" style={{ color: s.accent }}>{s.val}</div>
                <div className="th-stat-label">{s.label}</div>
                <div className="th-stat-bar-wrap">
                  <div className="th-stat-bar-fill" style={{ background: s.accent, width: i === 3 ? '95%' : '60%' }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ EXPLORE BY CATEGORY ══ */}
        <section className="th-section">
          <div className="th-section-header">
            <h2 className="th-section-title">Explore by Category</h2>
            <Link to="/categories" className="th-view-all">View All</Link>
          </div>
          <div className="th-category-row">
            {CATEGORIES.map(cat => (
              <button key={cat}
                className={`th-cat-pill${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >{cat}</button>
            ))}
          </div>
        </section>

        {/* ══ TRENDING + TOP PERFORMERS ══ */}
        <section className="th-section th-two-col">
          <div className="th-trending">
            <div className="th-section-header">
              <h2 className="th-section-title">🔥 Trending Now</h2>
              <Link to="/explore" className="th-view-all">View All</Link>
            </div>

            {loading ? (
              <div className="th-loading-grid">
                {[1,2,3].map(i => <div key={i} className="th-skeleton" />)}
              </div>
            ) : videos.length === 0 ? (
              <div className="th-empty">
                <div style={{fontSize:48,marginBottom:12}}>🎬</div>
                <h3>No videos yet!</h3>
                <p>Be the first to upload your performance.</p>
                <button className="th-btn-primary" style={{marginTop:16}} onClick={() => navigate('/upload')}>
                  ⬆ Upload Now
                </button>
              </div>
            ) : (
              <div className="th-video-grid">
                {videos.map(video => (
                  <VideoCard
                    key={video._id}
                    video={video}
                    currentUserId={user?._id}
                    onDelete={(id) => setVideos(prev => prev.filter(v => v._id !== id))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* TOP PERFORMERS */}
          <div className="th-performers-panel">
            <div className="th-section-header">
              <h2 className="th-section-title">🏆 Top Performers</h2>
              <Link to="/leaderboard" className="th-view-all">View All</Link>
            </div>

            {topPerformers.length === 0 ? (
              <div className="th-performers-empty">
                <div className="th-performers-empty-icon">🌟</div>
                <h4>No Top Performers Yet!</h4>
                <p>Upload your performance and get likes to appear here!</p>
                <button className="th-btn-primary"
                  style={{marginTop:14, fontSize:13, padding:'9px 20px'}}
                  onClick={() => navigate('/upload')}
                >⬆ Upload & Shine</button>
              </div>
            ) : (
              <div className="th-performers-list">
                {topPerformers.map((p, i) => (
                  <div key={p._id || i} className="th-performer-row"
                    style={{cursor:'pointer'}}
                    onClick={() => navigate(`/profile/${p._id}`)}
                  >
                    <div className={`th-rank th-rank-${i+1}`}>{i+1}</div>
                    <div className="th-perf-avatar-initial">
                      {p.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="th-perf-info">
                      <div className="th-perf-name">{p.username}</div>
                      <div className="th-perf-followers">
                        {fmt(p.followers?.length || 0)} Followers
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ══ RIGHT PANEL ══ */}
      <aside className="th-right-panel">

        {/* Upcoming Competitions */}
        <div className="th-panel-section">
          <div className="th-panel-header">
            <span className="th-panel-title">Upcoming Competitions</span>
            <Link to="/competitions" className="th-view-all">View All</Link>
          </div>
          {competitions.map((c, i) => (
            <div key={i} className="th-comp-row"
              onClick={() => navigate('/competitions')}
              style={{cursor:'pointer'}}
            >
              <div className="th-comp-icon" style={{background: c.color+'22', color: c.color}}>
                {c.icon}
              </div>
              <div className="th-comp-info">
                <div className="th-comp-name">{c.name}</div>
                <div className="th-comp-date">
                  {c.status === 'active' ? '🟢 Active' : '⏳ Upcoming'}
                  {c.date ? ` · ${c.date}` : ''}
                </div>
              </div>
              <button className="th-participate-btn"
                onClick={(e) => { e.stopPropagation(); navigate('/competitions'); }}
              >
                {c.status === 'active' ? 'Join' : 'Soon'}
              </button>
            </div>
          ))}
        </div>

        {/* Thoughts Widget */}
        <div className="th-panel-section th-thoughts-widget">
          <div className="th-panel-header">
            <span className="th-panel-title">💭 Thoughts</span>
            <Link to="/thoughts" className="th-view-all">View All</Link>
          </div>

          {recentThoughts.length === 0 ? (
            <div className="th-thoughts-empty-widget">
              <p>No thoughts yet. Be the first! 💬</p>
              <button className="th-thought-share-btn" onClick={() => navigate('/thoughts')}>
                ✨ Share a Thought
              </button>
            </div>
          ) : (
            <div className="th-thoughts-list-widget">
              {recentThoughts.slice(0, 3).map(t => (
                <div key={t._id} className="th-thought-item" onClick={() => navigate('/thoughts')}>
                  <div className="th-thought-item-avatar">
                    {t.author?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="th-thought-item-content">
                    <div className="th-thought-item-author">{t.author?.username}</div>
                    <div className="th-thought-item-text">
                      {t.text?.length > 60 ? t.text.slice(0,60) + '...' : t.text}
                    </div>
                    <div className="th-thought-item-meta">
                      ❤️ {t.likes?.length || 0} · {formatTime(t.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              <button className="th-thought-share-btn" onClick={() => navigate('/thoughts')}>
                ✨ Share a Thought
              </button>
            </div>
          )}
        </div>
      </aside>

      {searchOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:998 }}
          onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
        />
      )}








{/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className="th-mobile-bottom-nav">
        <div className="th-mobile-bottom-nav-inner">
          <Link to="/" className={`th-mobile-nav-btn ${activePage==='Home'?'active':''}`} onClick={()=>setActivePage('Home')}>
            <span className="mob-icon">🏠</span>
            <span className="mob-label">Home</span>
          </Link>
          <Link to="/explore" className={`th-mobile-nav-btn ${activePage==='Explore'?'active':''}`} onClick={()=>setActivePage('Explore')}>
            <span className="mob-icon">🔍</span>
            <span className="mob-label">Explore</span>
          </Link>
          <Link to="/upload" className="th-mobile-nav-btn upload-mob">
            <span className="mob-icon">⬆</span>
            <span className="mob-label">Upload</span>
          </Link>
          <Link to="/competitions" className="th-mobile-nav-btn">
            <span className="mob-icon">🏆</span>
            <span className="mob-label">Contest</span>
          </Link>
          <Link to="/profile" className="th-mobile-nav-btn">
            <span className="mob-icon">👤</span>
            <span className="mob-label">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}