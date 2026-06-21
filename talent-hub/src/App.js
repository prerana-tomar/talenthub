import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import './App.css';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Leaderboard from './pages/Leaderboard';
import Categories from './pages/Categories';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import VideoPlayer from './pages/VideoPlayer';
import Live from './pages/Live';
import Thoughts from './pages/Thoughts';
import Competitions from './pages/Competitions';
import MyUploads from './pages/MyUploads';
import Following from './pages/Following';
import Saved    from './pages/Saved';
import Messages from './pages/Messages';
import HighlightStudio from './pages/HighlightStudio';
import CreativeStudio from './pages/CreativeStudio';
import CollabHub from './pages/CollabHub';



// ...






// ── Global Theme Context ──────────────────────────────────
export const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

// ── Protected Route ───────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('th_token');
  return token ? children : <Navigate to="/login" />;
};

// ── Navbar Layout ─────────────────────────────────────────
const WithNavbar = ({ children }) => (
  <>
    <Navbar />
    <main className="main-content">{children}</main>
  </>
);

// ── Global Mobile Bottom Navigation ───────────────────────
function MobileBottomNav() {
  const location = useLocation();
  const path = location.pathname;

  if (path === '/login' || path === '/register') return null;

  const getActivePage = () => {
    if (path === '/') return 'home';
    if (path.includes('/explore')) return 'explore';
    if (path.includes('/upload')) return 'upload';
    if (path.includes('/thoughts')) return 'thoughts';
    if (path.includes('/profile')) return 'profile';
    return '';
  };

  const activePage = getActivePage();

  return (
    <nav className="global-mobile-bottom-nav">
      <div className="global-mobile-bottom-nav-inner">
        <Link to="/" className={`global-nav-btn ${activePage === 'home' ? 'active' : ''}`}>
          <span className="global-icon">🏠</span>
          <span className="global-label">Home</span>
        </Link>
        <Link to="/explore" className={`global-nav-btn ${activePage === 'explore' ? 'active' : ''}`}>
          <span className="global-icon">🔍</span>
          <span className="global-label">Explore</span>
        </Link>
        <Link to="/upload" className="global-nav-btn global-upload">
          <span className="global-icon">⬆</span>
          <span className="global-label">Upload</span>
        </Link>
        <Link to="/thoughts" className={`global-nav-btn ${activePage === 'thoughts' ? 'active' : ''}`}>
          <span className="global-icon">💭</span>
          <span className="global-label">Thoughts</span>
        </Link>
        <Link to="/profile" className={`global-nav-btn ${activePage === 'profile' ? 'active' : ''}`}>
          <span className="global-icon">👤</span>
          <span className="global-label">Profile</span>
        </Link>
      </div>
    </nav>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('th_darkmode');
    return saved !== null ? saved === 'true' : true; // default dark
  });

  // Apply theme to <body> whenever darkMode changes
  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('th_darkmode', darkMode);
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(d => !d);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      <Router>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/video/:id" element={<VideoPlayer />} />
          <Route path="/live"      element={<Live />} />

          <Route path="/explore"      element={<WithNavbar><Explore /></WithNavbar>} />
          <Route path="/leaderboard"  element={<WithNavbar><Leaderboard /></WithNavbar>} />
          <Route path="/categories"   element={<WithNavbar><Categories /></WithNavbar>} />
          <Route path="/thoughts"     element={<WithNavbar><Thoughts /></WithNavbar>} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/uploads" element={<WithNavbar><ProtectedRoute><MyUploads /></ProtectedRoute></WithNavbar>} />
          <Route path="/following" element={<WithNavbar><ProtectedRoute><Following /></ProtectedRoute></WithNavbar>} />
          <Route path="/saved"    element={<WithNavbar><ProtectedRoute><Saved /></ProtectedRoute></WithNavbar>} />
          <Route path="/messages" element={<WithNavbar><ProtectedRoute><Messages /></ProtectedRoute></WithNavbar>} />
          <Route path="/highlight-studio" element={<WithNavbar><ProtectedRoute><HighlightStudio /></ProtectedRoute></WithNavbar>} />
          <Route path="/creative-studio" element={<WithNavbar><CreativeStudio /></WithNavbar>} />
          <Route path="/collab" element={<WithNavbar><CollabHub /></WithNavbar>} />
          

          



          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/upload" element={
            <WithNavbar><ProtectedRoute><Upload /></ProtectedRoute></WithNavbar>
          } />
          <Route path="/profile" element={
            <WithNavbar><ProtectedRoute><Profile /></ProtectedRoute></WithNavbar>
          } />
          <Route path="/settings" element={
            <WithNavbar><ProtectedRoute><Settings /></ProtectedRoute></WithNavbar>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <MobileBottomNav />
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;
