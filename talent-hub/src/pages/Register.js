import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: name, email, password }), // ✅ FIXED
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('th_token', data.token);  // ✅ FIXED
        localStorage.setItem('th_user', JSON.stringify(data.user));  // ✅ FIXED
        navigate('/');
      } else {
        setError(data.message || 'Registration failed. Try again.');
      }
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="th-login-page">
      <div className="th-login-glow" />
      <div className="th-login-card">
        <h2>Join The Stage</h2>
        <p className="sub">Create your free TalentHub account</p>

        {error && (
          <div style={{
            background: 'rgba(255,80,80,0.1)',
            border: '1px solid rgba(255,80,80,0.3)',
            color: '#ff7070', padding: '10px 14px',
            borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <div className="th-field">
          <label>Full Name</label>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="th-field">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="th-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <button
          className="th-btn-main th-login-btn"
          onClick={handleSubmit}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Creating account...' : 'Create Account 🚀'}
        </button>

        <p className="th-login-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
