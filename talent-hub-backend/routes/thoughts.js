
import React, { useState, useEffect, useRef } from 'react';
import './Thoughts.css';

const CATEGORIES = ['All', 'General', 'Music', 'Dance', 'Poetry', 'Comedy', 'Art'];
const POST_CATEGORIES = ['General', 'Music', 'Dance', 'Poetry', 'Comedy', 'Art'];

const EMOJI_CATEGORIES = {
  '😀': ['😀','😂','🥹','😍','🥰','😎','🤩','😭','😤','🤔','😴','🥳','😇','🤗','😏','🙄','😬','🤯','🥺','😢'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💝','✨','🌟','⭐','🔥','💫'],
  '👏': ['👏','🙌','🤝','👍','👎','✌️','🤞','🤟','🤘','👌','🤌','🫶','💪','🦾','🫂','🙏','👋','🫡','🤙','👆'],
  '🎵': ['🎵','🎶','🎤','🎧','🎸','🎹','🥁','🎺','🎻','🎼','🎙️','🎚️','🎛️','📻','🎷','🪗','🪘','🎯','🏆','🥇'],
  '🌸': ['🌸','🌺','🌻','🌹','🌷','🍀','🌿','🌱','🌳','🌴','🌊','🌈','⭐','🌙','☀️','🌤️','⛅','🌧️','❄️','🌺'],
};

export default function Thoughts() {
  const [thoughts, setThoughts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState('All');
  const [text, setText]             = useState('');
  const [postCat, setPostCat]       = useState('General');
  const [posting, setPosting]       = useState(false);
  const [showForm, setShowForm]     = useState(false);

  // Image states
  const [image, setImage]           = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef                     = useRef();

  // Emoji states
  const [showEmoji, setShowEmoji]   = useState(false);
  const [emojiTab, setEmojiTab]     = useState('😀');
  const textRef                     = useRef();

  // Edit states
  const [editingId, setEditingId]   = useState(null);
  const [editText, setEditText]     = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');
  const token = localStorage.getItem('th_token') || localStorage.getItem('token');

  useEffect(() => { fetchThoughts(); }, [category]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.emoji-picker-wrapper') && !e.target.closest('.emoji-toggle-btn')) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchThoughts = async () => {
    setLoading(true);
    try {
      const url = category === 'All'
        ? 'https://talenthub-w1cc.onrender.com/api/thoughts'
        : `https://talenthub-w1cc.onrender.com/api/thoughts?category=${category}`;
      const res  = await fetch(url);
      const data = await res.json();
      setThoughts(data.thoughts || data || []);
    } catch { setThoughts([]); }
    finally  { setLoading(false); }
  };

  // ── Image handlers ──
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image 5MB se chhoti honi chahiye!'); return; }
    setImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Emoji insert at cursor ──
  const insertEmoji = (emoji) => {
    const el = textRef.current;
    if (!el) { setText(t => t + emoji); return; }
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  // ── Post thought (with optional image) ──
  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      let res;
      if (image) {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('category', postCat);
        formData.append('image', image);
        res = await fetch('https://talenthub-w1cc.onrender.com/api/thoughts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        res = await fetch('https://talenthub-w1cc.onrender.com/api/thoughts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text, category: postCat }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setThoughts(prev => [data, ...prev]);
        setText('');
        setPostCat('General');
        setShowForm(false);
        removeImage();
        setShowEmoji(false);
      }
    } catch {}
    setPosting(false);
  };

  const handleLike = async (id) => {
    if (!token) return alert('Login karo pehle!');
    try {
      const res  = await fetch(`https://talenthub-w1cc.onrender.com/api/thoughts/${id}/like`, {
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
      const res = await fetch(`https://talenthub-w1cc.onrender.com/api/thoughts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setThoughts(prev => prev.filter(t => t._id !== id));
    } catch {}
  };

  const startEdit = (thought) => { setEditingId(thought._id); setEditText(thought.text); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const handleEditSave = async (id) => {
    if (!editText.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`https://talenthub-w1cc.onrender.com/api/thoughts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: editText }),
      });
      const data = await res.json();
      if (res.ok) {
        setThoughts(prev => prev.map(t => t._id === id ? { ...t, text: data.text || editText } : t));
        setEditingId(null);
        setEditText('');
      } else { alert(data.message || 'Failed to edit'); }
    } catch { alert('Network error'); }
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

  const handleCancelForm = () => {
    setShowForm(false);
    setText('');
    removeImage();
    setShowEmoji(false);
    setPostCat('General');
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
          <button className="new-thought-btn" onClick={() => showForm ? handleCancelForm() : setShowForm(true)}>
            {showForm ? '✕ Cancel' : '✨ Share Thought'}
          </button>
        )}
      </div>

      {/* ── POST FORM ── */}
      {showForm && token && (
        <div className="thought-form">
          <div className="thought-form-avatar">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="thought-form-right">

            {/* Category selector inside form */}
            <div className="form-category-row">
              {POST_CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`form-cat-pill ${postCat === c ? 'active' : ''}`}
                  onClick={() => setPostCat(c)}
                >{c}</button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textRef}
              placeholder="Apna thought share karo... ✨"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              maxLength={500}
            />

            {/* Image Preview */}
            {imagePreview && (
              <div className="form-img-preview">
                <img src={imagePreview} alt="preview" />
                <button className="form-img-remove" onClick={removeImage} title="Remove image">✕</button>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmoji && (
              <div className="emoji-picker-wrapper">
                <div className="emoji-tabs">
                  {Object.keys(EMOJI_CATEGORIES).map(tab => (
                    <button
                      key={tab}
                      className={`emoji-tab ${emojiTab === tab ? 'active' : ''}`}
                      onClick={() => setEmojiTab(tab)}
                    >{tab}</button>
                  ))}
                </div>
                <div className="emoji-grid">
                  {EMOJI_CATEGORIES[emojiTab].map(em => (
                    <button key={em} className="emoji-btn" onClick={() => insertEmoji(em)}>{em}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer: tools + post button */}
            <div className="thought-form-footer">
              <div className="form-tools">
                {/* Image upload */}
                <button
                  className="form-tool-btn"
                  onClick={() => fileRef.current?.click()}
                  title="Gallery se image upload karo"
                >
                  🖼️
                  <span>Photo</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                />

                {/* Emoji toggle */}
                <button
                  className={`form-tool-btn emoji-toggle-btn ${showEmoji ? 'active' : ''}`}
                  onClick={() => setShowEmoji(v => !v)}
                  title="Emoji add karo"
                >
                  😊
                  <span>Emoji</span>
                </button>
              </div>

              <div className="form-right-actions">
                <span className="char-count">{text.length}/500</span>
                <button
                  className="post-btn"
                  onClick={handlePost}
                  disabled={posting || !text.trim()}
                >
                  {posting ? '⏳ Posting...' : '🚀 Post Thought'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories filter */}
      <div className="thoughts-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`thought-cat-btn ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >{cat}</button>
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
                {isOwner(thought) && (
                  <div className="thought-owner-actions">
                    <button className="thought-edit-btn" onClick={() => startEdit(thought)} title="Edit">✏️</button>
                    <button className="thought-delete-btn" onClick={() => handleDelete(thought._id)} title="Delete">🗑</button>
                  </div>
                )}
              </div>

              {/* Edit mode */}
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
                      <button className="edit-cancel-btn" onClick={cancelEdit} disabled={editSaving}>Cancel</button>
                      <button className="edit-save-btn" onClick={() => handleEditSave(thought._id)} disabled={editSaving || !editText.trim()}>
                        {editSaving ? 'Saving...' : '✅ Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="thought-text">{thought.text}</p>
              )}

              {/* Image */}
              {thought.image && (
                <img
                  src={`https://talenthub-w1cc.onrender.com${thought.image}`}
                  alt="thought"
                  className="thought-image"
                />
              )}

              {/* Actions */}
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
