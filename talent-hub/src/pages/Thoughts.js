import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../config';
import AppreciationBar from '../components/AppreciationBar';
import './Thoughts.css';

const CATEGORIES = ['All', 'General', 'Music', 'Dance', 'Poetry', 'Comedy', 'Art'];

const PRESET_TRACKS = [
  { name: "🎵 Acoustic Calm", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { name: "🎵 Lo-Fi Chill Beat", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { name: "🎵 Cinematic Vibe", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { name: "🎵 Smooth Jazz", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { name: "🎵 Upbeat Rhythm", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" }
];

export default function Thoughts() {
  const [thoughts, setThoughts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState('All');
  const [text, setText]             = useState('');
  const [posting, setPosting]       = useState(false);
  const [showForm, setShowForm]     = useState(false);

  // Share states
  const [sharingThought, setSharingThought]   = useState(null);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [shareSearchUsers, setShareSearchUsers] = useState([]);
  const [shareConversations, setShareConversations] = useState([]);
  const [shareLoadingConvs, setShareLoadingConvs] = useState(false);
  const [shareSearching, setShareSearching] = useState(false);
  const [sharedStatus, setSharedStatus]       = useState({});
  const [toastMessage, setToastMessage]       = useState('');

  // Image upload states
  const [selectedImages, setSelectedImages]   = useState([]);
  const [imagePreviews, setImagePreviews]     = useState([]);
  const fileInputRef                          = useRef(null);

  // Music upload & playback states
  const [imageFit, setImageFit]               = useState('cover');
  const [musicUrl, setMusicUrl]               = useState('');
  const [musicName, setMusicName]             = useState('');
  const [uploadingAudio, setUploadingAudio]   = useState(false);
  const [playingAudioId, setPlayingAudioId]   = useState(null);
  const audioInputRef                         = useRef(null);
  const audioPlayerRef                        = useRef(null);

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

  // Clean up audio playback on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchThoughts(); }, [category]);

  const fetchThoughts = async () => {
    setLoading(true);
    try {
      const url = category === 'All'
  ? `${API}/api/thoughts`
  : `${API}/api/thoughts?category=${category}`;
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
    setImageFit('cover');
    setMusicUrl('');
    setMusicName('');
    setShowForm(false);
  };

  const handleAudioSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Audio file size 15MB se kam honi chahiye');
      return;
    }
    setUploadingAudio(true);
    try {
      const audioFormData = new FormData();
      audioFormData.append('audio', file);
      const res = await fetch(`${API}/api/videos/upload-audio`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: audioFormData
      });
      const data = await res.json();
      if (res.ok) {
        setMusicUrl(data.url);
        setMusicName(file.name);
      } else {
        alert(data.message || 'Audio upload fail ho gaya');
      }
    } catch {
      alert('Audio file upload error');
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const playTrack = (id, url) => {
    if (playingAudioId === id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const newAudio = new Audio(url);
      newAudio.play();
      newAudio.onended = () => {
        setPlayingAudioId(null);
      };
      audioPlayerRef.current = newAudio;
      setPlayingAudioId(id);
    }
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
        formData.append('imageFit', imageFit);
        formData.append('musicUrl', musicUrl);
        formData.append('musicName', musicName);
        selectedImages.forEach(img => formData.append('images', img));

        res  = await fetch(`${API}/api/thoughts`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        // No images — send JSON as before
        res  = await fetch(`${API}/api/thoughts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text,
            category: category === 'All' ? 'General' : category,
            imageFit,
            musicUrl,
            musicName
          }),
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



  // ── DELETE ──
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this thought?')) return;
    try {
      const res = await fetch(`${API}/api/thoughts/${id}`, {
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
      const res  = await fetch(`${API}/api/thoughts/${id}`, {
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
      const res  = await fetch(`${API}/api/thoughts/${thoughtId}/comments`, {
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

  // ── SHARE HANDLERS ──
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const openShareModal = async (thought) => {
    setSharingThought(thought);
    setShareSearchQuery('');
    setShareSearchUsers([]);
    setSharedStatus({});
    if (!token) return;
    setShareLoadingConvs(true);
    try {
      const res = await fetch(`${API}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setShareConversations(Array.isArray(data) ? data : []);
    } catch {
      setShareConversations([]);
    } finally {
      setShareLoadingConvs(false);
    }
  };

  useEffect(() => {
    if (!shareSearchQuery.trim()) {
      setShareSearchUsers([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setShareSearching(true);
      try {
        const res = await fetch(`${API}/api/messages/users/search?q=${shareSearchQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShareSearchUsers(Array.isArray(data) ? data : []);
      } catch {
        setShareSearchUsers([]);
      } finally {
        setShareSearching(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [shareSearchQuery, token]);

  const handleInternalShare = async (receiverId) => {
    if (!token) return alert('Login karo pehle!');
    setSharedStatus(prev => ({ ...prev, [receiverId]: 'Sending...' }));
    
    const thoughtUrl = `${window.location.origin}/thoughts?id=${sharingThought._id}`;
    const shareText = `Look at this thought on Talent Hub by @${sharingThought.author?.username || 'user'}:\n"${sharingThought.text.substring(0, 100)}${sharingThought.text.length > 100 ? '...' : ''}"\n\nLink: ${thoughtUrl}`;

    try {
      const res = await fetch(`${API}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId, text: shareText })
      });
      if (res.ok) {
        setSharedStatus(prev => ({ ...prev, [receiverId]: 'Sent!' }));
      } else {
        setSharedStatus(prev => ({ ...prev, [receiverId]: 'Failed' }));
      }
    } catch {
      setSharedStatus(prev => ({ ...prev, [receiverId]: 'Failed' }));
    }
  };

  const handleCopyLink = (thoughtId) => {
    const thoughtUrl = `${window.location.origin}/thoughts?id=${thoughtId}`;
    navigator.clipboard.writeText(thoughtUrl)
      .then(() => triggerToast('Link copied to clipboard! 📋'))
      .catch(() => triggerToast('Failed to copy link ✕'));
  };

  const handleWhatsAppShare = (thought) => {
    const thoughtUrl = `${window.location.origin}/thoughts?id=${thought._id}`;
    const text = `Check out this shayari on Talent Hub by @${thought.author?.username || 'user'}:\n\n"${thought.text}"\n\nRead more here: ${thoughtUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Handle auto-scroll and highlight for ?id=THOUGHT_ID
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const thoughtId = params.get('id');
    if (thoughtId && !loading && thoughts.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`thought-${thoughtId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted-thought');
          
          // Clear query param so reload doesn't trigger scroll again
          window.history.replaceState(null, '', window.location.pathname);

          setTimeout(() => {
            element.classList.remove('highlighted-thought');
          }, 3000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.search, loading, thoughts]);

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
    return `${img}`;
  };

  return (
    <div className="thoughts-page">

      {/* Premium Page Hero */}
      <div className="th-page-hero">
        <div className="th-page-hero-text">
          <h1 className="th-page-hero-title">CREATOR <span>THOUGHTS</span></h1>
          <p className="th-page-hero-subtitle">Share your talent journey, insights, milestones, and connect with the creator community in real time.</p>
          {token && (
            <button className="new-thought-btn" onClick={() => { setShowForm(f => !f); if (showForm) resetForm(); }} style={{ marginTop: '16px', width: 'fit-content' }}>
              {showForm ? '✕ Cancel' : '✨ Share Thought'}
            </button>
          )}
        </div>
        <div className="th-page-hero-img-wrap">
          💭
        </div>
      </div>

      {/* ── POST FORM ── */}
      {showForm && token && (
        <div className="thought-form">
          <div className="thought-form-avatar">
            {user?.profilePic ? (
              <img src={user.profilePic} alt={user.username} className="thought-avatar-img" />
            ) : (
              user?.username?.[0]?.toUpperCase() || 'U'
            )}
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

            {imagePreviews.length > 0 && (
              <div className="form-image-fit-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 10px 0' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>Image Style:</span>
                <button
                  type="button"
                  className={`form-cat-pill ${imageFit === 'cover' ? 'active' : ''}`}
                  onClick={() => setImageFit('cover')}
                >
                  Crop (16:9)
                </button>
                <button
                  type="button"
                  className={`form-cat-pill ${imageFit === 'contain' ? 'active' : ''}`}
                  onClick={() => setImageFit('contain')}
                >
                  Fit (Full Image)
                </button>
              </div>
            )}

            <div className="form-music-section" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎵 Background Music:
                </span>
                {musicName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#34d399', fontSize: '0.82rem', fontWeight: 700 }}>{musicName}</span>
                    <button
                      type="button"
                      onClick={() => { setMusicUrl(''); setMusicName(''); }}
                      style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <span style={{ color: '#475569', fontSize: '0.8rem' }}>None Selected</span>
                )}
              </div>

              {!musicUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
                    {PRESET_TRACKS.map(track => (
                      <button
                        key={track.name}
                        type="button"
                        onClick={() => { setMusicUrl(track.url); setMusicName(track.name); }}
                        className="form-cat-pill"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {track.name}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => audioInputRef.current.click()}
                    className="image-upload-trigger"
                    disabled={uploadingAudio}
                    style={{ borderStyle: 'dotted', height: '36px', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    📁 {uploadingAudio ? 'Uploading Music...' : 'Upload Custom MP3/Audio'}
                  </button>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    onChange={handleAudioSelect}
                  />
                </div>
              )}
            </div>

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
            <div key={thought._id} id={`thought-${thought._id}`} className="thought-card">

              {/* Card Header */}
              <div className="thought-card-header">
                <div className="thought-avatar">
                  {thought.author?.profilePic ? (
                    <img src={thought.author.profilePic} alt={thought.author.username} className="thought-avatar-img" />
                  ) : (
                    thought.author?.username?.[0]?.toUpperCase() || 'U'
                  )}
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

              {/* ── BACKGROUND MUSIC PLAYER ── */}
              {thought.musicUrl && (
                <div
                  className="thought-music-player"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '16px',
                    padding: '10px 16px',
                    margin: '12px 0 16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span
                      style={{
                        animation: playingAudioId === thought._id ? 'floatPageHeroIcon 2s ease-in-out infinite alternate' : 'none',
                        fontSize: '20px',
                        display: 'inline-block',
                      }}
                    >
                      💿
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {thought.musicName || 'Background Music'}
                      </span>
                      <span style={{ color: '#a78bfa', fontSize: '0.68rem', fontWeight: 500 }}>
                        {playingAudioId === thought._id ? 'Playing Track' : 'Tap to Play'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => playTrack(thought._id, thought.musicUrl)}
                    style={{
                      background: playingAudioId === thought._id
                        ? 'rgba(244, 63, 94, 0.15)'
                        : 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                      border: playingAudioId === thought._id ? '1px solid rgba(244, 63, 94, 0.3)' : 'none',
                      color: playingAudioId === thought._id ? '#f43f5e' : '#fff',
                      padding: '6px 16px',
                      borderRadius: '50px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {playingAudioId === thought._id ? '⏸ Pause' : '▶ Play'}
                  </button>
                </div>
              )}

              {/* ── IMAGES DISPLAY ── */}
              {thought.images && thought.images.length > 0 && (
                <div className={`thought-images-grid count-${Math.min(thought.images.length, 4)}`}>
                  {thought.images.slice(0, 4).map((img, i) => (
                    <div
                      key={i}
                      className="thought-img-wrapper"
                      style={
                        Math.min(thought.images.length, 4) === 1 && thought.imageFit === 'contain'
                          ? { aspectRatio: 'auto', maxHeight: '500px', display: 'flex', justifyContent: 'center', background: 'transparent' }
                          : {}
                      }
                    >
                      <img
                        src={getImageUrl(img)}
                        alt=""
                        className="thought-card-image"
                        style={
                          Math.min(thought.images.length, 4) === 1 && thought.imageFit === 'contain'
                            ? { objectFit: 'contain', height: 'auto', maxHeight: '500px', borderRadius: '14px' }
                            : {}
                        }
                      />
                      {i === 3 && thought.images.length > 4 && (
                        <div className="more-images-overlay">+{thought.images.length - 4}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Legacy single image support */}
              {!thought.images && thought.image && (
                <img
                  src={getImageUrl(thought.image)}
                  alt="thought"
                  className="thought-image"
                  style={thought.imageFit === 'contain' ? { objectFit: 'contain', height: 'auto', maxHeight: '500px' } : {}}
                />
              )}

              {/* Actions */}
              <div className="thought-actions">
                <AppreciationBar
                  targetId={thought._id}
                  type="thought"
                  initialAppreciations={thought.appreciations || thought.likes}
                />
                <div className="thought-secondary-actions">
                  <button
                    className="thought-comment-toggle-btn"
                    onClick={() => toggleComments(thought._id)}
                  >
                    💬 {thought.comments?.length || 0} Comments
                  </button>
                  <button
                    className="thought-share-btn"
                    onClick={() => openShareModal(thought)}
                  >
                    🔗 Share
                  </button>
                </div>
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
                            {comment.author?.profilePic ? (
                              <img src={comment.author.profilePic} alt={comment.author.username} className="comment-avatar-img" />
                            ) : (
                              comment.author?.username?.[0]?.toUpperCase() || 'U'
                            )}
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
                        {user?.profilePic ? (
                          <img src={user.profilePic} alt={user?.username} className="comment-avatar-img" />
                        ) : (
                          user?.username?.[0]?.toUpperCase() || 'U'
                        )}
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
      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}

      {/* ── SHARE MODAL ── */}
      {sharingThought && (
        <div className="share-modal-overlay" onClick={() => setSharingThought(null)}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Shayari</h3>
              <button className="share-modal-close" onClick={() => setSharingThought(null)}>✕</button>
            </div>
            
            <div className="share-modal-body">
              {/* Thought Preview */}
              <div className="share-preview-card">
                <span className="share-preview-author">@{sharingThought.author?.username || 'user'}</span>
                <p className="share-preview-text">{sharingThought.text.substring(0, 80)}{sharingThought.text.length > 80 ? '...' : ''}</p>
              </div>

              {/* Quick Share Options */}
              <div className="quick-share-buttons">
                <button className="quick-share-opt copy" onClick={() => handleCopyLink(sharingThought._id)}>
                  <span>🔗</span> Copy Link
                </button>
                <button className="quick-share-opt whatsapp" onClick={() => handleWhatsAppShare(sharingThought)}>
                  <span>💬</span> WhatsApp
                </button>
              </div>

              {/* Internal Chat List */}
              <div className="share-chat-section">
                <h4>Send to Friends</h4>
                {!token ? (
                  <p className="share-login-prompt">Please login to send directly to friends.</p>
                ) : (
                  <>
                    <input
                      type="text"
                      className="share-search-input"
                      placeholder="Search users..."
                      value={shareSearchQuery}
                      onChange={e => setShareSearchQuery(e.target.value)}
                    />

                    <div className="share-users-list">
                      {shareSearching || shareLoadingConvs ? (
                        <div className="share-loading">Loading users...</div>
                      ) : (shareSearchQuery.trim() ? shareSearchUsers : shareConversations).length === 0 ? (
                        <div className="share-empty">No users found</div>
                      ) : (
                        (shareSearchQuery.trim() ? shareSearchUsers : shareConversations).map(usr => {
                          const userId = usr.userId || usr._id;
                          const username = usr.username;
                          const profilePic = usr.profilePic;
                          const status = sharedStatus[userId];

                          return (
                            <div key={userId} className="share-user-item">
                              <div className="share-user-avatar">
                                {profilePic ? (
                                  <img src={profilePic} alt={username} className="share-user-avatar-img" />
                                ) : (
                                  username?.[0]?.toUpperCase() || 'U'
                                )}
                              </div>
                              <span className="share-user-name">{username}</span>
                              <button
                                className={`share-send-btn ${status === 'Sent!' ? 'sent' : status === 'Sending...' ? 'sending' : ''}`}
                                onClick={() => handleInternalShare(userId)}
                                disabled={status === 'Sent!' || status === 'Sending...'}
                              >
                                {status || 'Send'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}