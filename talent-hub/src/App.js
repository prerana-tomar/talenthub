import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;