import './Upload.css';
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../config';

const PRESET_TRACKS = [
  { name: "🎵 Acoustic Calm", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { name: "🎵 Lo-Fi Chill Beat", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { name: "🎵 Cinematic Vibe", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { name: "🎵 Smooth Jazz", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { name: "🎵 Upbeat Rhythm", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" }
];

function Upload() {
  const [title, setTitle]       = useState('');
  const [category, setCategory] = useState('Music');
  const [file, setFile]         = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [progress, setProgress] = useState(0);
  const [musicUrl, setMusicUrl]   = useState('');
  const [musicName, setMusicName] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioInputRef             = useRef(null);
  const navigate = useNavigate();

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleAudioSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Audio file size 15MB se kam honi chahiye');
      return;
    }
    setUploadingAudio(true);
    setError('');
    try {
      const token = localStorage.getItem('th_token') || localStorage.getItem('token');
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
        setError(data.message || 'Audio upload failed.');
      }
    } catch {
      setError('Audio upload connection error.');
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!title || !file) {
      setError('Please add a title and choose a video file.');
      return;
    }

    const token = localStorage.getItem('th_token') || localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to upload. Please sign in first.');
      return;
    }

    setLoading(true);
    setProgress(0);

    let thumbnailUrl = '';
    let thumbnailFilename = '';

    if (thumbnailFile) {
      try {
        const thumbFormData = new FormData();
        thumbFormData.append('thumbnail', thumbnailFile);
        const thumbRes = await fetch(`${API}/api/videos/upload-thumbnail`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: thumbFormData
        });
        const thumbData = await thumbRes.json();
        if (thumbRes.ok) {
          thumbnailUrl = thumbData.url;
          thumbnailFilename = thumbData.filename;
        } else {
          setError(thumbData.message || 'Failed to upload thumbnail image.');
          setLoading(false);
          return;
        }
      } catch (err) {
        setError('Thumbnail upload failed.');
        setLoading(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('musicUrl', musicUrl);
    formData.append('musicName', musicName);
    if (thumbnailUrl) {
      formData.append('thumbnailUrl', thumbnailUrl);
      formData.append('thumbnailFilename', thumbnailFilename);
    }

    try {
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
          }
        };

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status === 201) {
              resolve(data);
            } else {
              reject(new Error(data.message || 'Upload failed.'));
            }
          } catch {
            reject(new Error('Server returned invalid response.'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error. Cannot connect to server.'));

        xhr.open('POST', `${API}/api/videos`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      alert(`"${result.title}" published successfully! 🎉`);
      navigate('/');

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="th-upload-page">
      {/* Premium Hero Section */}
      <div className="th-page-hero">
        <div className="th-page-hero-text">
          <h1 className="th-page-hero-title">UPLOAD YOUR <span>TALENT</span></h1>
          <p className="th-page-hero-subtitle">Share your unique talent with the world. Upload your performance now and inspire creators worldwide.</p>
        </div>
        <div className="th-page-hero-img-wrap">
          📤
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(220,53,69,0.12)',
          border: '1px solid rgba(220,53,69,0.35)',
          color: '#ff6b6b',
          fontSize: '13px',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          ⚠ {error}
        </div>
      )}

      <div
        className="th-dropzone"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !loading && document.getElementById('file-input').click()}
        style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
      >
        <div className="th-dropzone-icon">🎬</div>
        {file ? (
          <p><strong style={{ color: '#f5c842' }}>{file.name}</strong></p>
        ) : (
          <p><strong>Click or drag</strong> your video here<br />MP4, MOV up to 100MB</p>
        )}
        <input
          id="file-input"
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files[0])}
        />
      </div>

      {/* Thumbnail Upload */}
      <div className="th-thumbnail-upload-box">
        <label className="th-thumb-upload-label">🖼️ Custom Thumbnail (Optional)</label>
        <div className="th-thumb-upload-row">
          <input
            type="file"
            accept="image/*"
            id="thumbnail-input"
            onChange={e => setThumbnailFile(e.target.files[0])}
            disabled={loading}
            className="th-thumb-file-input"
          />
          {thumbnailFile && (
            <span className="th-thumb-selected-name">✓ Selected</span>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ margin: '16px 0' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#7a7f94',
            marginBottom: '6px',
          }}>
            <span>Uploading to Cloudinary...</span>
            <span>{progress}%</span>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '99px',
            height: '6px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: '#f5c842',
              borderRadius: '99px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      <div className="th-upload-form">
        <div className="th-field">
          <label>Video Title</label>
          <input
            type="text"
            placeholder="Give your performance a name..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="th-field">
          <label>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            disabled={loading}
          >
            <option>Music</option>
            <option>Dance</option>
            <option>Hip-Hop</option>
            <option>Comedy</option>
            <option>Other</option>
          </select>
        </div>

        <div className="th-field" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginTop: '8px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🎵 Background Music (Optional)</span>
            {musicName ? (
              <span style={{ color: '#34d399', fontSize: '12px' }}>{musicName}</span>
            ) : (
              <span style={{ color: '#555a6e', fontSize: '12px' }}>None</span>
            )}
          </label>
          
          {musicName ? (
            <button
              type="button"
              onClick={() => { setMusicUrl(''); setMusicName(''); }}
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                color: '#f43f5e',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center',
                width: 'fit-content'
              }}
            >
              ✕ Remove Music
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {PRESET_TRACKS.map(track => (
                  <button
                    key={track.name}
                    type="button"
                    onClick={() => { setMusicUrl(track.url); setMusicName(track.name); }}
                    className="explore-cat-btn"
                    style={{ whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '11px' }}
                  >
                    {track.name}
                  </button>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => audioInputRef.current.click()}
                className="th-dropzone"
                disabled={uploadingAudio}
                style={{ padding: '12px', margin: 0, fontSize: '13px', borderStyle: 'dashed', background: 'rgba(255,255,255,0.02)' }}
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

        <button
          className="th-btn-main"
          onClick={handleSubmit}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? `Uploading... ${progress}%` : 'Publish Performance 🚀'}
        </button>
      </div>
    </div>
  );
}

export default Upload;