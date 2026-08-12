import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home as HomeIcon, Compass, LayoutGrid, Users, Radio, Trophy, Star,
  BarChart3, MessageCircle, Wand2, UserCircle, UploadCloud, Sparkles,
  Bookmark, UserPlus, MessageSquare, Settings, Crown, Video, Eye,
  ThumbsUp, Upload, Flame, Clapperboard, Send, Mic, Music2,
  Zap, Laugh, Guitar, BookOpen
} from 'lucide-react';
import VideoCard from '../components/VideoCard';
import OnboardingTour from '../components/OnboardingTour';
import { useTheme } from '../App';
import API from '../config';
import './Home.css';

const TOUR_STEPS = [
  { target: '.th-topnav', fallbackText: 'Home', text: 'Yahan se apna pura top menu panel access karein.' },
  { target: '.th-upload-btn', fallbackText: 'Upload', text: 'Apni videos aur performances ko yahan se website par direct upload karein.' },
  { target: '.th-sidebar a[href="/"]', fallbackText: 'Home', text: 'Home page par popular performances aur trending community updates ko track karein.' },
  { target: '.th-sidebar a[href="/explore"]', fallbackText: 'Explore', text: 'India ke best performance videos ko search aur browse yahan se karein.' },
  { target: '.th-sidebar a[href="/categories"]', fallbackText: 'Categories', text: 'Singing, Dance, Rap, Comedy jaisi different categories ke videos directly filter karein.' },
  { target: '.th-sidebar a[href="/collab"]', fallbackText: 'Collab Hub', text: 'Dushre performance creators ke sath collaborate karne ke liye requests yahan post karein.' },
  { target: '.th-sidebar a[href="/live"]', fallbackText: 'Live Performances', text: 'Live streams perform karein ya dushre creators ko live perform karte hue dekhein.' },
  { target: '.th-sidebar a[href="/competitions"]', fallbackText: 'Competitions', text: 'Active tournaments aur competitions mein register karke exciting titles jeetein.' },
  { target: '.th-sidebar a[href="/top"]', fallbackText: 'Top Performers', text: 'Humare platform ke highly-rated aur famous stars ko yahan checkout karein.' },
  { target: '.th-sidebar a[href="/leaderboard"]', fallbackText: 'Leaderboard', text: 'Weekly ranks dekhein aur check karein ki trending performers list me lead kaun kar raha hai.' },
  { target: '.th-sidebar a[href="/thoughts"]', fallbackText: 'Thoughts', text: 'Apni status lines, poetry, shayari ya general announcements share karein.' },
  { target: '.th-sidebar a[href="/creative-studio"]', fallbackText: 'Creative Studio', text: 'Multi-track options aur creative AI features ke sath apna new content model karein.' },
  { target: '.th-sidebar a[href="/profile"]', fallbackText: 'My Profile', text: 'Apna user profile stats, biography description aur personal links manage karein.' },
  { target: '.th-sidebar a[href="/uploads"]', fallbackText: 'My Uploads', text: 'Apne upload kiye gaye saare performance videos ka record aur metrics yahan check karein.' },
  { target: '.th-sidebar a[href="/highlight-studio"]', fallbackText: 'AI Highlights', text: 'AI Highlight Studio se apne upload videos ke crop & peak shorts reels automatic banayein.' },
  { target: '.th-sidebar a[href="/saved"]', fallbackText: 'Saved', text: 'Apne bookmark aur save kiye gaye videos ko ek jagah yahan manage karein.' },
  { target: '.th-sidebar a[href="/following"]', fallbackText: 'Following', text: 'Jin creators ko aap follow karte hain unki latest performance feeds yahan dekhein.' },
  { target: '.th-sidebar a[href="/messages"]', fallbackText: 'Messages', text: 'Fans aur other creators ke sath chat conversations aur messages yahan read karein.' },
  { target: '.th-sidebar a[href="/settings"]', fallbackText: 'Settings', text: 'Apna login password change karein aur other account details configure karein.' },
  { target: '.th-premium-card', fallbackText: 'Premium', text: 'Premium stage membership lekar dushro se jyada reach, views aur exclusive search visibility payein!' },
];

const CATEGORIES = ['All','Singing','Dance','Rap','Comedy','Acting','Instrumental','Poetry'];

// ✅ Icon helper — name se lucide icon match karo
const getCompIcon = (comp) => {
  const name = (comp?.name || comp?.title || '').toLowerCase();
  if (name.includes('sing'))                        return Mic;
  if (name.includes('dance'))                       return Music2;
  if (name.includes('rap'))                         return Zap;
  if (name.includes('comedy'))                      return Laugh;
  if (name.includes('guitar') || name.includes('instrument')) return Guitar;
  if (name.includes('poet'))                        return BookOpen;
  if (name.includes('music') || name.includes('song')) return Music2;
  return Trophy;
};

// ✅ Fallback competitions — no icon field needed
const FALLBACK_COMPETITIONS = [
  { name:'Singing Superstar', date:'Coming Soon', color:'#a78bfa', status:'upcoming' },
  { name:'Dance Battle',      date:'Coming Soon', color:'#f472b6', status:'upcoming' },
  { name:'Rap Showdown',      date:'Coming Soon', color:'#34d399', status:'active'   },
];

const NAV_ITEMS = [
  { icon: HomeIcon,      label:'Home',              path:'/' },
  { icon: Compass,       label:'Explore',           path:'/explore' },
  { icon: LayoutGrid,    label:'Categories',        path:'/categories' },
  { icon: Users,         label:'Collab Hub',        path:'/collab' },
  { icon: Radio,         label:'Live Performances', path:'/live', live:true },
  { icon: Trophy,        label:'Competitions',      path:'/competitions' },
  { icon: Star,          label:'Top Performers',    path:'/top' },
  { icon: BarChart3,     label:'Leaderboard',       path:'/leaderboard' },
  { icon: MessageCircle, label:'Thoughts',          path:'/thoughts' },
  { icon: Wand2,         label:'Creative Studio',   path:'/creative-studio' },
];

const BOTTOM_NAV = [
  { icon: UserCircle,    label:'My Profile',    path:'/profile' },
  { icon: UploadCloud,   label:'My Uploads',    path:'/uploads' },
  { icon: Sparkles,      label:'AI Highlights', path:'/highlight-studio' },
  { icon: Bookmark,      label:'Saved',         path:'/saved' },
  { icon: UserPlus,      label:'Following',     path:'/following' },
  { icon: MessageSquare, label:'Messages',      path:'/messages' },
  { icon: Settings,      label:'Settings',      path:'/settings' },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activePage,     setActivePage]     = useState('Home');
  const [showTour,       setShowTour]       = useState(false);
  const [videos,         setVideos]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const { darkMode, toggleTheme }           = useTheme();
  const [competitions,   setCompetitions]   = useState(FALLBACK_COMPETITIONS);

  const [realUserCount,  setRealUserCount]  = useState(null);
  const [realStats,      setRealStats]      = useState({ users:0, videos:0, views:0 });
  const [topPerformers,  setTopPerformers]  = useState([]);
  const [recentThoughts, setRecentThoughts] = useState([]);

  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchResults,  setSearchResults]  = useState([]);
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searching,      setSearching]      = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('th_user') || 'null');

  // Auto-trigger tour on first load
  useEffect(() => {
    const timer = setTimeout(() => setShowTour(true), 1000);
    return () => clearTimeout(timer);
  }, []);

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
          <UploadCloud size={16} /> Upload Performance
        </button>

        <nav className="th-sidenav">
          {NAV_ITEMS.map(item => {
            const IconComp = item.icon;
            return (
              <Link key={item.label} to={item.path}
                className={`th-sidenav-item${activePage === item.label ? ' active' : ''}`}
                onClick={() => setActivePage(item.label)}
              >
                <span className="th-nav-icon"><IconComp size={18} /></span>
                <span>{item.label}</span>
                {item.live && <span className="th-live-pill">LIVE</span>}
              </Link>
            );
          })}
        </nav>

        <div className="th-sidebar-divider" />

        <nav className="th-sidenav">
          {BOTTOM_NAV.map(item => {
            const IconComp = item.icon;
            return (
              <Link key={item.label} to={item.path} className="th-sidenav-item">
                <span className="th-nav-icon"><IconComp size={18} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="th-premium-card">
          <div className="th-premium-icon"><Crown size={20} /></div>
          <div className="th-premium-text">
            <strong>Go Premium</strong>
            <span>Unlock exclusive features and get more visibility.</span>
          </div>
          <button className="th-premium-btn">Upgrade Now</button>
        </div>

        <div className="th-darkmode-row">
          <span className="th-nav-icon">{darkMode ? '🌙' : '☀️'}</span>
          <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          <div className={`th-toggle${darkMode ? ' on' : ''}`} onClick={toggleTheme}>
            <div className="th-toggle-thumb" />
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="th-main">

        {/* ══ TOPBAR ══ */}
        <header className="th-topbar">
          <button className="th-hamburger-btn" onClick={() => setMobileMenuOpen(prev => !prev)} aria-label="Open menu">
            <span /><span /><span />
          </button>

          <div className="th-mobile-logo" onClick={() => navigate('/')}>
            TALENT<span>HUB</span>
          </div>

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
            <button className="th-topnav-link th-guide-nav-btn" onClick={() => setShowTour(true)}>
              Guide 💡
            </button>
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
                <div className="th-user-avatar">
                  {user.profilePic
                    ? <img src={user.profilePic} alt={user.username} className="th-user-avatar-img" />
                    : user.username?.[0]?.toUpperCase() || 'U'}
                </div>
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
              <div className="th-hero-badge"><Star size={13} /> INDIA'S TALENT STAGE</div>
              <h1 className="th-hero-title">
                SHOW YOUR<br />
                <span className="th-hero-accent">TALENT</span>
              </h1>
              <p className="th-hero-desc">
                <span className="th-desc-highlight">Show Your Talent. Inspire the World.</span>{' '}
                <Sparkles size={16} style={{display:'inline', verticalAlign:'middle'}} />
                <br /><br />
                Upload videos, grow your audience, earn recognition, and become part of
                <span className="th-desc-highlight"> India's creative talent community.</span>
                <br /><br />
                <span className="th-desc-cta">
                  <Send size={14} style={{display:'inline', verticalAlign:'middle', marginRight:6}} />
                  Start your journey with TalentHub today!
                </span>
              </p>
              <div className="th-hero-btns">
                <button className="th-btn-primary" onClick={() => navigate('/upload')}>
                  <UploadCloud size={16} /> Upload Now
                </button>
                <button className="th-btn-outline" onClick={() => window.scrollTo({top:700,behavior:'smooth'})}>
                  ▶ Explore Performances
                </button>
              </div>
              <div className="th-social-proof">
                <span style={{display:'flex', alignItems:'center', gap:8, fontSize:15}}>
                  <Users size={20} color="#f5a623" />
                  <span>
                    <strong style={{color:'#f5a623'}}>{realUserCount !== null ? realUserCount : '...'}</strong>{' '}
                    performers already shining <Sparkles size={14} style={{display:'inline', verticalAlign:'middle'}} />
                  </span>
                </span>
              </div>
            </div>

            <div className="th-hero-img-wrap">
              <img src="/singer_hero_neon.png" alt="Concert Stage" className="th-hero-img" />
              <div className="th-hero-img-overlay" />
              <div className="th-live-card">
                <div className="th-live-badge"><span className="th-live-dot" /> LIVE NOW</div>
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
              { icon: Users,    val: fmt(realStats.users),  label:'Performers',        accent:'#a855f7', className:'stat-icon-performers' },
              { icon: Video,    val: fmt(realStats.videos), label:'Videos',            accent:'#f472b6', className:'stat-icon-videos' },
              { icon: Eye,      val: fmt(realStats.views),  label:'Views',             accent:'#34d399', className:'stat-icon-views' },
              { icon: ThumbsUp, val: '95%',                  label:'Positive Feedback', accent:'#f5a623', className:'stat-icon-feedback' },
            ].map((s, i) => {
              const StatIcon = s.icon;
              return (
                <div key={i} className="th-stat-box">
                  <div className={`th-stat-icon-wrap ${s.className}`}>
                    <StatIcon size={20} color={s.accent} />
                  </div>
                  <div className="th-stat-val" style={{ color: s.accent }}>{s.val}</div>
                  <div className="th-stat-label">{s.label}</div>
                  <div className="th-stat-bar-wrap">
                    <div className="th-stat-bar-fill" style={{ background: s.accent, width: i === 3 ? '95%' : '60%' }} />
                  </div>
                </div>
              );
            })}
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
              <h2 className="th-section-title">
                <Flame size={19} style={{display:'inline', verticalAlign:'middle', marginRight:6, color:'#f97316'}} />
                Trending Now
              </h2>
              <Link to="/explore" className="th-view-all">View All</Link>
            </div>

            {loading ? (
              <div className="th-loading-grid">
                {[1,2,3].map(i => <div key={i} className="th-skeleton" />)}
              </div>
            ) : videos.length === 0 ? (
              <div className="th-empty">
                <div style={{fontSize:48, marginBottom:12, display:'flex', justifyContent:'center'}}>
                  <Clapperboard size={48} />
                </div>
                <h3>No videos yet!</h3>
                <p>Be the first to upload your performance.</p>
                <button className="th-btn-primary" style={{marginTop:16}} onClick={() => navigate('/upload')}>
                  <UploadCloud size={16} /> Upload Now
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
              <h2 className="th-section-title">
                <Trophy size={19} style={{display:'inline', verticalAlign:'middle', marginRight:6, color:'#f5a623'}} />
                Top Performers
              </h2>
              <Link to="/leaderboard" className="th-view-all">View All</Link>
            </div>

            {topPerformers.length === 0 ? (
              <div className="th-performers-empty">
                <div className="th-performers-empty-icon"><Star size={32} /></div>
                <h4>No Top Performers Yet!</h4>
                <p>Upload your performance and get likes to appear here!</p>
                <button className="th-btn-primary"
                  style={{marginTop:14, fontSize:13, padding:'9px 20px'}}
                  onClick={() => navigate('/upload')}
                >
                  <UploadCloud size={14} /> Upload & Shine
                </button>
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
                      {p.profilePic
                        ? <img src={p.profilePic} alt={p.username} className="th-perf-avatar-img" />
                        : p.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="th-perf-info">
                      <div className="th-perf-name">{p.username}</div>
                      <div className="th-perf-followers">{fmt(p.followers?.length || 0)} Followers</div>
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

        {/* ✅ Upcoming Competitions — Lucide icons */}
        <div className="th-panel-section">
          <div className="th-panel-header">
            <span className="th-panel-title">UPCOMING COMPETITIONS</span>
            <Link to="/competitions" className="th-view-all">View All</Link>
          </div>
          {competitions.map((c, i) => {
            const CompIcon = getCompIcon(c);
            const color    = c.color || '#7c3aed';
            return (
              <div key={i} className="th-comp-row"
                onClick={() => navigate('/competitions')}
                style={{cursor:'pointer'}}
              >
                <div className="th-comp-icon" style={{background: color+'22', color}}>
                  <CompIcon size={16} />
                </div>
                <div className="th-comp-info">
                  <div className="th-comp-name">{c.name || c.title}</div>
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
            );
          })}
        </div>

        {/* Thoughts Widget */}
        <div className="th-panel-section th-thoughts-widget">
          <div className="th-panel-header">
            <span className="th-panel-title">
              <MessageCircle size={16} style={{display:'inline', verticalAlign:'middle', marginRight:6}} />
              THOUGHTS
            </span>
            <Link to="/thoughts" className="th-view-all">View All</Link>
          </div>

          {recentThoughts.length === 0 ? (
            <div className="th-thoughts-empty-widget">
              <p>No thoughts yet. Be the first! 💬</p>
              <button className="th-thought-share-btn" onClick={() => navigate('/thoughts')}>
                <Sparkles size={14} /> Share a Thought
              </button>
            </div>
          ) : (
            <div className="th-thoughts-list-widget">
              {recentThoughts.slice(0, 3).map(t => (
                <div key={t._id} className="th-thought-item" onClick={() => navigate('/thoughts')}>
                  <div className="th-thought-item-avatar">
                    {t.author?.profilePic
                      ? <img src={t.author.profilePic} alt={t.author.username} className="th-user-avatar-img" />
                      : t.author?.username?.[0]?.toUpperCase() || 'U'}
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
                <Sparkles size={14} /> Share a Thought
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Search overlay */}
      {searchOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:998 }}
          onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
        />
      )}

      {/* ══ MOBILE DRAWER ══ */}
      {mobileMenuOpen && (
        <div className="th-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}
      <div className={`th-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="th-mobile-drawer-header">
          <div className="th-sidebar-logo" onClick={() => { navigate('/'); setMobileMenuOpen(false); }}>
            <span className="th-logo-text">TALENT<span className="th-logo-accent">HUB</span></span>
            <span className="th-logo-sub">India's Talent Stage</span>
          </div>
          <button className="th-drawer-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
        </div>

        <button className="th-upload-btn" onClick={() => { navigate('/upload'); setMobileMenuOpen(false); }}>
          <UploadCloud size={16} /> Upload Performance
        </button>

        <nav className="th-sidenav">
          {NAV_ITEMS.map(item => {
            const IconComp = item.icon;
            return (
              <Link key={item.label} to={item.path}
                className={`th-sidenav-item${activePage === item.label ? ' active' : ''}`}
                onClick={() => { setActivePage(item.label); setMobileMenuOpen(false); }}
              >
                <span className="th-nav-icon"><IconComp size={18} /></span>
                <span>{item.label}</span>
                {item.live && <span className="th-live-pill">LIVE</span>}
              </Link>
            );
          })}
        </nav>

        <div className="th-sidebar-divider" />

        <nav className="th-sidenav">
          {BOTTOM_NAV.map(item => {
            const IconComp = item.icon;
            return (
              <Link key={item.label} to={item.path} className="th-sidenav-item"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="th-nav-icon"><IconComp size={18} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="th-premium-card">
          <div className="th-premium-icon"><Crown size={20} /></div>
          <div className="th-premium-text">
            <strong>Go Premium</strong>
            <span>Unlock exclusive features and get more visibility.</span>
          </div>
          <button className="th-premium-btn">Upgrade Now</button>
        </div>

        <div className="th-darkmode-row" style={{ marginTop:'auto', padding:'16px 16px 24px' }}>
          <span className="th-nav-icon">{darkMode ? '🌙' : '☀️'}</span>
          <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          <div className={`th-toggle${darkMode ? ' on' : ''}`} onClick={toggleTheme}>
            <div className="th-toggle-thumb" />
          </div>
        </div>
      </div>

      {/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className="th-mobile-bottom-nav">
        <div className="th-mobile-bottom-nav-inner">
          <Link to="/" className={`th-mobile-nav-btn ${activePage==='Home'?'active':''}`} onClick={()=>setActivePage('Home')}>
            <span className="mob-icon"><HomeIcon size={18} /></span>
            <span className="mob-label">Home</span>
          </Link>
          <Link to="/explore" className={`th-mobile-nav-btn ${activePage==='Explore'?'active':''}`} onClick={()=>setActivePage('Explore')}>
            <span className="mob-icon"><Compass size={18} /></span>
            <span className="mob-label">Explore</span>
          </Link>
          <Link to="/upload" className="th-mobile-nav-btn upload-mob">
            <span className="mob-icon"><Upload size={18} /></span>
            <span className="mob-label">Upload</span>
          </Link>
          <Link to="/thoughts" className={`th-mobile-nav-btn ${activePage==='Thoughts'?'active':''}`} onClick={()=>setActivePage('Thoughts')}>
            <span className="mob-icon"><MessageCircle size={18} /></span>
            <span className="mob-label">Thoughts</span>
          </Link>
          <Link to="/profile" className="th-mobile-nav-btn">
            <span className="mob-icon"><UserCircle size={18} /></span>
            <span className="mob-label">Profile</span>
          </Link>
        </div>
      </nav>

      {/* ══ ONBOARDING TOUR ══ */}
      <OnboardingTour
        steps={TOUR_STEPS}
        run={showTour}
        onClose={() => { setShowTour(false); setMobileMenuOpen(false); }}
        onStepChange={(stepIndex) => {
          if (window.innerWidth <= 768) {
            const drawerSteps = [4,5,6,7,8,9,11,13,14,15,16,17,18,19];
            if (drawerSteps.includes(stepIndex)) setMobileMenuOpen(true);
            else setMobileMenuOpen(false);
          }
        }}
      />
    </div>
  );
}