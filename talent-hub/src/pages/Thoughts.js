import React, { useState, useEffect, useRef } from 'react';
import './Thoughts.css';

const CATEGORIES = ['All', 'General', 'Music', 'Dance', 'Poetry', 'Comedy', 'Art'];

export default function Thoughts() {
  const [thoughts, setThoughts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState('All');
  const [text, setText]             = useState('');
  const [posting, setPosting]       = useState(false);
  const [showForm, setShowForm]     = useState(false);

  // Image upload states
  const [selectedImages, setSelectedImages]   = useState([]);
  const [imagePreviews, setImagePreviews]     = useState([]);
  const fileInputRef                          = useRef(null);

  // Edit states
  const [editingId, setEditingId]   = useState(null);
  const [editText, setEditText]     = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Comment states
  const [openCommentId, setOpenCommentId]   = useState(null);
  const [commentTexts, setCommentTexts]     = useState({});
  const [postingComment, setPostingComment] = useState(false);

  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');
  const token = localStorage.getItem('th_token') || localStorage.getItem('token');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchThoughts(); }, [category]);

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

  // ── IMAGE HANDLERS ──
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedImages.length > 4) {
      alert('Maximum 4 images upload kar sakte hain');
      return;
    }
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024); // 5MB limit
    if (validFiles.length !== files.length) {
      alert('Kuch images 5MB se badi hain, unhe skip kiya gaya');
    }
    setSelectedImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(f => URL.createObjectURL(f));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setText('');
    setSelectedImages([]);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setShowForm(false);
  };

  // ── POST ──
  const handlePost = async () => {
    if (!text.trim() && selectedImages.length === 0) return;
    setPosting(true);
    try {
      let res, data;

      if (selectedImages.length > 0) {
        // Use FormData when images are present
        const formData = new FormData();
        formData.append('text', text);
        formData.append('category', category === 'All' ? 'General' : category);
        selectedImages.forEach(img => formData.append('images', img));

        res  = await fetch('https://talenthub-w1cc.onrender.com/api/thoughts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        // No images — send JSON as before
        res  = await fetch('https://talenthub-w1cc.onrender.com/api/thoughts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text, category: category === 'All' ? 'General' : category }),
        });
      }

      data = await res.json();
      if (res.ok) {
        setThoughts(prev => [data, ...prev]);
        resetForm();
      } else {
        alert(data.message || 'Post failed');
      }
    } catch { alert('Network error'); }
    setPosting(false);
  };

  // ── LIKE ──
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

  // ── DELETE ──
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

  // ── EDIT ──
  const startEdit  = (thought) => { setEditingId(thought._id); setEditText(thought.text); };
  const cancelEdit = ()        => { setEditingId(null); setEditText(''); };

  const handleEditSave = async (id) => {
    if (!editText.trim()) return;
    setEditSaving(true);
    try {
      const res  = await fetch(`https://talenthub-w1cc.onrender.com/api/thoughts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: editText }),
      });
      const data = await res.json();
      if (res.ok) {
        setThoughts(prev => prev.map(t => t._id === id ? { ...t, text: data.text || editText } : t));
        cancelEdit();
      } else { alert(data.message || 'Failed to edit'); }
    } catch { alert('Network error'); }
    setEditSaving(false);
  };

  // ── COMMENTS ──
  const toggleComments = (id) => setOpenCommentId(prev => prev === id ? null : id);

  const handleCommentPost = async (thoughtId) => {
    const commentText = commentTexts[thoughtId]?.trim();
    if (!commentText || !token) return;
    setPostingComment(true);
    try {
      const res  = await fetch(`https://talenthub-w1cc.onrender.com/api/thoughts/${thoughtId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: commentText }),
      });
      const data = await res.json();
      if (res.ok) {
        setThoughts(prev => prev.map(t =>
          t._id === thoughtId ? { ...t, comments: data.comments || [...(t.comments || []), data] } : t
        ));
        setCommentTexts(prev => ({ ...prev, [thoughtId]: '' }));
      }
    } catch {}
    setPostingComment(false);
  };

  // ── HELPERS ──
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

  const getImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `https://talenthub-w1cc.onrender.com${img}`;
  };

  return (
    <div className="thoughts-page">

      {/* ── HEADER ── */}
      <div className="thoughts-header">
        <div className="thoughts-header-left">
          <h1>💭 Thoughts</h1>
          <p>Share your talent journey with the community</p>
        </div>
        {token && (
          <button className="new-thought-btn" onClick={() => { setShowForm(f => !f); if (showForm) resetForm(); }}>
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
              <span className="form-category-label">Category:</span>
              <div className="form-category-pills">
                {CATEGORIES.filter(c => c !== 'All').map(cat => (
                  <button
                    key={cat}
                    className={`form-cat-pill ${(category === 'All' ? 'General' : category) === cat ? 'active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >{cat}</button>
                ))}
              </div>
            </div>

            <textarea
              placeholder="What's on your mind? Share your talent story..."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              maxLength={500}
            />

            {/* ── IMAGE PREVIEW GRID ── */}
            {imagePreviews.length > 0 && (
              <div className={`image-preview-grid count-${imagePreviews.length}`}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="preview-item">
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button className="remove-image-btn" onClick={() => removeImage(index)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── UPLOAD BUTTON ── */}
            {selectedImages.length < 4 && (
              <button className="image-upload-trigger" onClick={() => fileInputRef.current.click()}>
                🖼️ Photo Add Karo
                <span className="img-count-badge">{selectedImages.length}/4</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />

            <div className="thought-form-footer">
              <span className="char-count">{text.length}/500</span>
              <button
                className="post-btn"
                onClick={handlePost}
                disabled={posting || (!text.trim() && selectedImages.length === 0)}
              >
                {posting ? 'Posting...' : '🚀 Post Thought'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORIES ── */}
      <div className="thoughts-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`thought-cat-btn ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >{cat}</button>
        ))}
      </div>

      {/* ── LIST ── */}
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

              {/* ── IMAGES DISPLAY ── */}
              {thought.images && thought.images.length > 0 && (
                <div className={`thought-images-grid count-${Math.min(thought.images.length, 4)}`}>
                  {thought.images.slice(0, 4).map((img, i) => (
                    <div key={i} className="thought-img-wrapper">
                      <img src={getImageUrl(img)} alt="" className="thought-card-image" />
                      {i === 3 && thought.images.length > 4 && (
                        <div className="more-images-overlay">+{thought.images.length - 4}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Legacy single image support */}
              {!thought.images && thought.image && (
                <img src={getImageUrl(thought.image)} alt="thought" className="thought-image" />
              )}

              {/* Actions */}
              <div className="thought-actions">
                <button
                  className={`thought-like-btn ${thought._liked ? 'liked' : ''}`}
                  onClick={() => handleLike(thought._id)}
                >
                  {thought._liked ? '❤️' : '🤍'} {thought.likes?.length || 0} Likes
                </button>
                <button
                  className="thought-comment-toggle-btn"
                  onClick={() => toggleComments(thought._id)}
                >
                  💬 {thought.comments?.length || 0} Comments
                </button>
              </div>

              {/* ── COMMENTS SECTION ── */}
              {openCommentId === thought._id && (
                <div className="comments-section">

                  {/* Existing comments */}
                  {thought.comments && thought.comments.length > 0 && (
                    <div className="comments-list">
                      {thought.comments.map((comment, idx) => (
                        <div key={comment._id || idx} className="comment-item">
                          <div className="comment-avatar">
                            {comment.author?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="comment-body">
                            <span className="comment-author">{comment.author?.username || 'Unknown'}</span>
                            <p className="comment-text">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment */}
                  {token && (
                    <div className="comment-input-row">
                      <div className="comment-input-avatar">
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <input
                        className="comment-input"
                        placeholder="Comment likho..."
                        value={commentTexts[thought._id] || ''}
                        onChange={e => setCommentTexts(prev => ({ ...prev, [thought._id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCommentPost(thought._id)}
                        maxLength={300}
                      />
                      <button
                        className="comment-post-btn"
                        onClick={() => handleCommentPost(thought._id)}
                        disabled={postingComment || !commentTexts[thought._id]?.trim()}
                      >
                        {postingComment ? '...' : '➤'}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}