import './Upload.css';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Film, Image, Music, Tag, ChevronRight, X, Check } from 'lucide-react';
import API from '../config';

const PRESET_TRACKS = [
  { name: "Acoustic Calm",   url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { name: "Lo-Fi Chill",     url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { name: "Cinematic Vibe",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { name: "Smooth Jazz",     url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { name: "Upbeat Rhythm",   url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
];

const CATEGORIES = ['Music','Dance','Hip-Hop','Comedy','Poetry','Acting','Instrumental','Other'];

function Upload() {
  const [title,         setTitle]         = useState('');
  const [category,      setCategory]      = useState('Music');
  const [file,          setFile]          = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [progress,      setProgress]      = useState(0);
  const [musicUrl,      setMusicUrl]      = useState('');
  const [musicName,     setMusicName]     = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [isDragging,    setIsDragging]    = useState(false);
  const [heroVisible,   setHeroVisible]   = useState(false);
  const [step,          setStep]          = useState(1); // 1=video, 2=details, 3=music

  const audioInputRef = useRef(null);
  const navigate      = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith('video/')) {
      setFile(dropped);
      setStep(2);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setStep(2); }
  };

  const handleThumbnailChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setThumbnailFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setThumbnailPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleAudioSelect = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { alert('Audio file 15MB se kam honi chahiye'); return; }
    setUploadingAudio(true); setError('');
    try {
      const token = localStorage.getItem('th_token') || localStorage.getItem('token');
      const audioFormData = new FormData();
      audioFormData.append('audio', f);
      const res  = await fetch(`${API}/api/videos/upload-audio`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: audioFormData
      });
      const data = await res.json();
      if (res.ok) { setMusicUrl(data.url); setMusicName(f.name); }
      else setError(data.message || 'Audio upload failed.');
    } catch { setError('Audio upload error.'); }
    finally { setUploadingAudio(false); e.target.value = ''; }
  };

  const handleSubmit = async () => {
    setError('');
    if (!title || !file) { setError('Title aur video file zaroori hai.'); return; }
    const token = localStorage.getItem('th_token') || localStorage.getItem('token');
    if (!token) { setError('Pehle login karein.'); return; }
    setLoading(true); setProgress(0);

    let thumbnailUrl = '', thumbnailFilename = '';
    if (thumbnailFile) {
      try {
        const thumbFormData = new FormData();
        thumbFormData.append('thumbnail', thumbnailFile);
        const thumbRes  = await fetch(`${API}/api/videos/upload-thumbnail`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: thumbFormData
        });
        const thumbData = await thumbRes.json();
        if (thumbRes.ok) { thumbnailUrl = thumbData.url; thumbnailFilename = thumbData.filename; }
        else { setError(thumbData.message || 'Thumbnail upload failed.'); setLoading(false); return; }
      } catch { setError('Thumbnail upload failed.'); setLoading(false); return; }
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('musicUrl', musicUrl);
    formData.append('musicName', musicName);
    if (thumbnailUrl) { formData.append('thumbnailUrl', thumbnailUrl); formData.append('thumbnailFilename', thumbnailFilename); }

    try {
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status === 201) resolve(data);
            else reject(new Error(data.message || 'Upload failed.'));
          } catch { reject(new Error('Invalid server response.')); }
        };
        xhr.onerror = () => reject(new Error('Network error.'));
        xhr.open('POST', `${API}/api/videos`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Kuch galat hua. Try again.');
      setProgress(0);
    } finally { setLoading(false); }
  };

  const steps = [
    { num: 1, label: 'Video',   icon: <Film size={14} /> },
    { num: 2, label: 'Details', icon: <Tag size={14} /> },
    { num: 3, label: 'Music',   icon: <Music size={14} /> },
  ];

  return (
    <div className="up-page">

      {/* ── COMPACT HERO ── */}
      <div className={`up-hero ${heroVisible ? 'visible' : ''}`}>
        <div className="up-hero-left">
          <div className="up-hero-badge">
            <UploadCloud size={12} /> Upload Performance
          </div>
          <h1 className="up-hero-title">
            Share Your <span>Talent</span>
          </h1>
          <p className="up-hero-sub">
            Upload your performance and inspire creators worldwide.
          </p>
        </div>
        <div className="up-hero-icon">
          <UploadCloud size={26} className="up-float" />
        </div>
      </div>

      {/* ── STEP INDICATOR ── */}
      <div className="up-steps">
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div
              className={`up-step ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''}`}
              onClick={() => step > s.num && setStep(s.num)}
            >
              <div className="up-step-circle">
                {step > s.num ? <Check size={13} /> : s.icon}
              </div>
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`up-step-line ${step > s.num ? 'done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="up-error">⚠ {error}</div>
      )}

      {/* ── STEP 1: VIDEO DROP ── */}
      {step === 1 && (
        <div
          className={`up-dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('up-file-input').click()}
        >
          <input id="up-file-input" type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileChange} />

          <div className="up-dropzone-inner">
            <div className="up-dropzone-icon">
              <UploadCloud size={36} />
              <div className="up-dropzone-ring up-ring1" />
              <div className="up-dropzone-ring up-ring2" />
            </div>
            {file ? (
              <>
                <p className="up-file-name">✓ {file.name}</p>
                <span className="up-file-size">{(file.size / (1024*1024)).toFixed(1)} MB</span>
                <button className="up-next-btn" onClick={e => { e.stopPropagation(); setStep(2); }}>
                  Continue <ChevronRight size={15} />
                </button>
              </>
            ) : (
              <>
                <p className="up-drop-title">Drop your video here</p>
                <p className="up-drop-sub">or click to browse • MP4, MOV up to 100MB</p>
                <div className="up-drop-formats">
                  <span>MP4</span><span>MOV</span><span>WEBM</span><span>AVI</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: DETAILS ── */}
      {step === 2 && (
        <div className="up-card">
          <div className="up-card-header">
            <Film size={16} />
            <span>Video Details</span>
          </div>

          {/* File info bar */}
          <div className="up-file-bar">
            <div className="up-file-bar-icon"><Film size={14} /></div>
            <span className="up-file-bar-name">{file?.name}</span>
            <button className="up-file-bar-change" onClick={() => { setFile(null); setStep(1); }}>Change</button>
          </div>

          <div className="up-field">
            <label>Video Title *</label>
            <input
              type="text"
              placeholder="Give your performance a name..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="up-field">
            <label>Category *</label>
            <div className="up-cat-grid">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`up-cat-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                  disabled={loading}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Thumbnail */}
          <div className="up-field">
            <label><Image size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Custom Thumbnail (Optional)</label>
            <div className="up-thumb-row">
              {thumbnailPreview ? (
                <div className="up-thumb-preview">
                  <img src={thumbnailPreview} alt="thumbnail" />
                  <button className="up-thumb-remove" onClick={() => { setThumbnailFile(null); setThumbnailPreview(''); }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="up-thumb-drop" htmlFor="up-thumb-input">
                  <Image size={20} />
                  <span>Add Thumbnail</span>
                  <input id="up-thumb-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumbnailChange} disabled={loading} />
                </label>
              )}
            </div>
          </div>

          <div className="up-step-actions">
            <button className="up-back-btn" onClick={() => setStep(1)}>← Back</button>
            <button className="up-next-btn2" onClick={() => setStep(3)} disabled={!title.trim()}>
              Next: Music <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: MUSIC + PUBLISH ── */}
      {step === 3 && (
        <div className="up-card">
          <div className="up-card-header">
            <Music size={16} />
            <span>Background Music (Optional)</span>
          </div>

          {musicName ? (
            <div className="up-music-selected">
              <div className="up-music-selected-icon">🎵</div>
              <div className="up-music-selected-info">
                <span className="up-music-selected-name">{musicName}</span>
                <span className="up-music-selected-sub">Background track selected</span>
              </div>
              <button className="up-music-remove" onClick={() => { setMusicUrl(''); setMusicName(''); }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <p className="up-music-label">Choose a preset track:</p>
              <div className="up-presets">
                {PRESET_TRACKS.map(track => (
                  <button
                    key={track.name}
                    type="button"
                    className="up-preset-btn"
                    onClick={() => { setMusicUrl(track.url); setMusicName(track.name); }}
                  >
                    🎵 {track.name}
                  </button>
                ))}
              </div>

              <div className="up-music-divider"><span>or upload your own</span></div>

              <button
                type="button"
                className="up-audio-upload-btn"
                onClick={() => audioInputRef.current.click()}
                disabled={uploadingAudio}
              >
                <UploadCloud size={15} />
                {uploadingAudio ? 'Uploading...' : 'Upload MP3 / Audio File'}
              </button>
              <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioSelect} />
            </>
          )}

          {/* Progress bar */}
          {loading && (
            <div className="up-progress-wrap">
              <div className="up-progress-info">
                <span>Uploading to Cloudinary...</span>
                <span>{progress}%</span>
              </div>
              <div className="up-progress-bar">
                <div className="up-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="up-step-actions">
            <button className="up-back-btn" onClick={() => setStep(2)}>← Back</button>
            <button
              className="up-publish-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? `Uploading... ${progress}%` : '🚀 Publish Performance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Upload;