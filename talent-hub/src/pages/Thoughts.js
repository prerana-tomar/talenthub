import React, { useState, useEffect } from 'react';
import './Thoughts.css';

const CATEGORIES = ['All', 'General', 'Music', 'Dance', 'Poetry', 'Comedy', 'Art'];

export default function Thoughts() {
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState('All');
  const [text, setText]         = useState('');
  const [posting, setPosting]   = useState(false);
  const [showForm, setShowForm] = useState(false);

  // ✅ Edit states
  const [editingId, setEditingId]   = useState(null);
  const [editText, setEditText]     = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');
  const token = localStorage.getItem('th_token') || localStorage.getItem('token');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchThoughts(); }, [category]);

  const fetchThoughts = async () => {
    setLoading(true);
    try {
      const url = category === 'All'
        ? 'http://localhost:5000/api/thoughts'
        : `http://localhost:5000/api/thoughts?category=${category}`;
      const res  = await fetch(url);
      const data = await res.json();
      setThoughts(data.thoughts || data || []);
    } catch { setThoughts([]); }
    finally  { setLoading(false); }
  };

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('http://localhost:5000/api/thoughts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, category: category === 'All' ? 'General' : category }),
      });
      const data = await res.json();
      if (res.ok) {
        setThoughts(prev => [data, ...prev]);
        setText('');
        setShowForm(false);
      }
    } catch {}
    setPosting(false);
  };

  const handleLike = async (id) => {
    if (!token) return alert('Login karo pehle!');
    try {
      const res  = await fetch(`http://localhost:5000/api/thoughts/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setThoughts(prev => prev.map(t =>
          t._id === id ? { ...t, likes: Array(data.likes).fill(0), _liked: data.liked } : t
        ));
      }
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this thought?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/thoughts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setThoughts(prev => prev.filter(t => t._id !== id));
    } catch {}
  };

  // ✅ Edit functions
  const startEdit = (thought) => {
    setEditingId(thought._id);
    setEditText(thought.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleEditSave = async (id) => {
    if (!editText.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/thoughts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: editText }),
      });
      const data = await res.json();
      if (res.ok) {
        setThoughts(prev => prev.map(t =>
          t._id === id ? { ...t, text: data.text || editText } : t
        ));
        setEditingId(null);
        setEditText('');
      } else {
        alert(data.message || 'Failed to edit');
      }
    } catch {
      alert('Network error');
    }
    setEditSaving(false);
  };

  const isOwner = (thought) =>
    user && (
      thought.author?._id === user._id ||
      thought.author?._id === user.id  ||
      thought.author === user._id
    );

  const formatTime = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="thoughts-page">

      {/* Header */}
      <div className="thoughts-header">
        <div className="thoughts-header-left">
          <h1>💭 Thoughts</h1>
          <p>Share your talent journey with the community</p>
        </div>
        {token && (
          <button className="new-thought-btn" onClick={() => setShowForm(f => !f)}>
            {showForm ? '✕ Cancel' : '✨ Share Thought'}
          </button>
        )}
      </div>

      {/* Post form */}
      {showForm && token && (
        <div className="thought-form">
          <div className="thought-form-avatar">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="thought-form-right">
            <textarea
              placeholder="What's on your mind? Share your talent story..."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <div className="thought-form-footer">
              <span className="char-count">{text.length}/500</span>
              <button
                className="post-btn"
                onClick={handlePost}
                disabled={posting || !text.trim()}
              >
                {posting ? 'Posting...' : '🚀 Post Thought'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="thoughts-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`thought-cat-btn ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="thoughts-list">
          {[1,2,3].map(i => <div key={i} className="thought-skeleton" />)}
        </div>
      ) : thoughts.length === 0 ? (
        <div className="thoughts-empty">
          <div className="thoughts-empty-icon">💭</div>
          <h3>No thoughts yet in {category === 'All' ? 'any category' : category}</h3>
          <p>Be the first to share your talent journey!</p>
          {token && (
            <button className="thoughts-empty-btn" onClick={() => setShowForm(true)}>
              ✨ Share First Thought
            </button>
          )}
        </div>
      ) : (
        <div className="thoughts-list">
          {thoughts.map(thought => (
            <div key={thought._id} className="thought-card">

              {/* Card Header */}
              <div className="thought-card-header">
                <div className="thought-avatar">
                  {thought.author?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="thought-meta">
                  <span className="thought-author">{thought.author?.username || 'Unknown'}</span>
                  <span className="thought-time">{formatTime(thought.createdAt)}</span>
                </div>
                {thought.category && (
                  <span className="thought-category-badge">{thought.category}</span>
                )}

                {/* ✅ Edit + Delete buttons — sirf owner ko dikhenge */}
                {isOwner(thought) && (
                  <div className="thought-owner-actions">
                    <button
                      className="thought-edit-btn"
                      onClick={() => startEdit(thought)}
                      title="Edit"
                    >✏️</button>
                    <button
                      className="thought-delete-btn"
                      onClick={() => handleDelete(thought._id)}
                      title="Delete"
                    >🗑</button>
                  </div>
                )}
              </div>

              {/* ✅ Edit mode — textarea dikhega */}
              {editingId === thought._id ? (
                <div className="thought-edit-box">
                  <textarea
                    className="thought-edit-textarea"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={4}
                    maxLength={500}
                    autoFocus
                  />
                  <div className="thought-edit-footer">
                    <span className="char-count">{editText.length}/500</span>
                    <div className="thought-edit-btns">
                      <button
                        className="edit-cancel-btn"
                        onClick={cancelEdit}
                        disabled={editSaving}
                      >Cancel</button>
                      <button
                        className="edit-save-btn"
                        onClick={() => handleEditSave(thought._id)}
                        disabled={editSaving || !editText.trim()}
                      >
                        {editSaving ? 'Saving...' : '✅ Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="thought-text">{thought.text}</p>
              )}

              {thought.image && (
                <img
                  src={`http://localhost:5000${thought.image}`}
                  alt="thought"
                  className="thought-image"
                />
              )}

              <div className="thought-actions">
                <button
                  className={`thought-like-btn ${thought._liked ? 'liked' : ''}`}
                  onClick={() => handleLike(thought._id)}
                >
                  {thought._liked ? '❤️' : '🤍'} {thought.likes?.length || 0} Likes
                </button>
                <span className="thought-comments-count">
                  💬 {thought.comments?.length || 0} Comments
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}