import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './VideoEditor.css';

// Curated royalty-free fallback tracks
const FALLBACK_MUSIC = [
  { id: '1', name: '🎵 Acoustic Calm', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', artist: 'SoundHelix' },
  { id: '2', name: '🎵 Lo-Fi Chill Beat', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', artist: 'SoundHelix' },
  { id: '3', name: '🎵 Cinematic Vibe', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', artist: 'SoundHelix' },
  { id: '4', name: '🎵 Smooth Jazz', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', artist: 'SoundHelix' },
  { id: '5', name: '🎵 Upbeat Rhythm', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', artist: 'SoundHelix' },
];

export default function VideoEditor() {
  const navigate = useNavigate();

  // Video States
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Trimmer States
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Filter States
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);

  // Crop / Aspect Ratio States (9:16, 1:1, 16:9, original)
  const [aspectRatio, setAspectRatio] = useState('original');

  // Text Overlay States
  const [textOverlays, setTextOverlays] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [newText, setNewText] = useState('New Text');
  const textColor = '#ffffff';
  const textSize = 24;

  // Background Music States
  const [pixabayKey, setPixabayKey] = useState('');
  const [musicSearch, setMusicSearch] = useState('');
  const [musicTracks, setMusicTracks] = useState(FALLBACK_MUSIC);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [musicMuted, setMusicMuted] = useState(false);

  // Tabs for the settings panel
  const [activeTab, setActiveTab] = useState('trim'); // trim, filters, text, music

  // Refs
  const videoRef = useRef(null);
  const musicAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0, elementX: 0, elementY: 0 });

  // Revoke blob URL on cleanup
  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  // Synchronize Background Music with Video Play/Pause and Seek
  useEffect(() => {
    if (!musicAudioRef.current) return;
    const musicAudio = musicAudioRef.current;

    musicAudio.volume = musicMuted ? 0 : musicVolume;

    if (isPlaying && selectedMusic) {
      musicAudio.play().catch(e => console.error("Audio playback error:", e));
    } else {
      musicAudio.pause();
    }
  }, [isPlaying, selectedMusic, musicVolume, musicMuted]);

  // Handle Video Meta Load
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    setDuration(dur);
    setStartTime(0);
    setEndTime(dur);
  };

  // Video Time Update (Handles trimming auto-loop/pause)
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Trim loop guard: if current time goes past the trimmed end time
    if (time >= endTime) {
      videoRef.current.currentTime = startTime;
      if (!videoRef.current.loop) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // File Upload Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      setVideoFile(file);
      setVideoSrc(URL.createObjectURL(file));
      setIsPlaying(false);
      setSelectedMusic(null);
    }
  };

  // Play / Pause Video
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // Seek back if we are near the end
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Trimmer Sliders change
  const handleTrimChange = (type, val) => {
    if (!videoRef.current) return;
    const value = parseFloat(val);
    if (type === 'start') {
      const clampedVal = Math.min(value, endTime - 0.5);
      setStartTime(clampedVal);
      videoRef.current.currentTime = clampedVal;
    } else if (type === 'end') {
      const clampedVal = Math.max(value, startTime + 0.5);
      setEndTime(clampedVal);
    }
  };

  // CSS Filter resets
  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
  };

  // Text Overlay Add
  const addTextOverlay = () => {
    const newOverlay = {
      id: Date.now().toString(),
      text: newText,
      color: textColor,
      fontSize: textSize,
      x: 50, // default center percent
      y: 50,
    };
    setTextOverlays([...textOverlays, newOverlay]);
    setSelectedTextId(newOverlay.id);
  };

  // Text Overlay Delete
  const removeTextOverlay = (id) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  // Text property updates
  const updateSelectedText = (key, value) => {
    setTextOverlays(textOverlays.map(t => {
      if (t.id === selectedTextId) {
        return { ...t, [key]: value };
      }
      return t;
    }));
  };

  // Draggable Text logic using pointer events (unifies mouse and touch)
  const handlePointerDown = (e, item) => {
    e.preventDefault();
    setSelectedTextId(item.id);
    const box = containerRef.current.getBoundingClientRect();
    
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      elementX: (item.x / 100) * box.width,
      elementY: (item.y / 100) * box.height
    };

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - dragStartPos.current.x;
      const deltaY = moveEvent.clientY - dragStartPos.current.y;

      let newXPixels = dragStartPos.current.elementX + deltaX;
      let newYPixels = dragStartPos.current.elementY + deltaY;

      // Convert to percent
      let newXPercent = (newXPixels / box.width) * 100;
      let newYPercent = (newYPixels / box.height) * 100;

      // Clamp within boundaries
      newXPercent = Math.max(0, Math.min(100, newXPercent));
      newYPercent = Math.max(0, Math.min(100, newYPercent));

      setTextOverlays(prev => prev.map(t => {
        if (t.id === item.id) {
          return { ...t, x: newXPercent, y: newYPercent };
        }
        return t;
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Pixabay Music Fetch
  const searchPixabayMusic = async () => {
    if (!pixabayKey) {
      alert("Please enter a Pixabay API Key in the settings first!");
      return;
    }
    setMusicLoading(true);
    try {
      const query = encodeURIComponent(musicSearch || 'lofi');
      const url = `https://pixabay.com/api/music/?key=${pixabayKey}&q=${query}&page=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.hits && data.hits.length > 0) {
        const tracks = data.hits.map(h => ({
          id: h.id.toString(),
          name: h.title,
          url: h.audio,
          artist: h.tags || 'Pixabay Creator'
        }));
        setMusicTracks(tracks);
      } else {
        alert("No music tracks found on Pixabay for this query.");
      }
    } catch (err) {
      alert("Pixabay API fetch failed. Showing fallbacks instead.");
      setMusicTracks(FALLBACK_MUSIC);
    } finally {
      setMusicLoading(false);
    }
  };

  // Trigger file selection for local tracks
  const handleMusicSelect = (track) => {
    setSelectedMusic(track);
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
  };

  // Capture Frame and Export/Download as Image
  const handleExportFrame = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Create export Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Handle aspect ratios
    let targetWidth = videoEl.videoWidth;
    let targetHeight = videoEl.videoHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = videoEl.videoWidth;
    let sourceHeight = videoEl.videoHeight;

    if (aspectRatio === '9:16') {
      targetWidth = videoEl.videoHeight * (9 / 16);
      targetHeight = videoEl.videoHeight;
      sourceX = (videoEl.videoWidth - targetWidth) / 2;
      sourceWidth = targetWidth;
    } else if (aspectRatio === '1:1') {
      const minDim = Math.min(videoEl.videoWidth, videoEl.videoHeight);
      targetWidth = minDim;
      targetHeight = minDim;
      sourceX = (videoEl.videoWidth - minDim) / 2;
      sourceY = (videoEl.videoHeight - minDim) / 2;
      sourceWidth = minDim;
      sourceHeight = minDim;
    } else if (aspectRatio === '16:9') {
      targetHeight = videoEl.videoWidth * (9 / 16);
      targetWidth = videoEl.videoWidth;
      sourceY = (videoEl.videoHeight - targetHeight) / 2;
      sourceHeight = targetHeight;
    }

    // Set canvas dimensions
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Apply filters to context if supported
    if (ctx.filter !== undefined) {
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
    }

    // Draw video frame to canvas
    ctx.drawImage(
      videoEl,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, targetWidth, targetHeight
    );

    // Disable filter for drawing overlay text
    if (ctx.filter !== undefined) {
      ctx.filter = 'none';
    }

    // Draw text overlays relative to canvas size
    textOverlays.forEach(overlay => {
      ctx.fillStyle = overlay.color;
      // Scale font size according to the canvas width compared to preview container
      const containerBox = containerRef.current.getBoundingClientRect();
      const scaleFactor = targetWidth / containerBox.width;
      const finalFontSize = overlay.fontSize * scaleFactor;

      ctx.font = `bold ${finalFontSize}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Compute actual position on canvas
      const xPos = (overlay.x / 100) * targetWidth;
      const yPos = (overlay.y / 100) * targetHeight;

      ctx.fillText(overlay.text, xPos, yPos);
    });

    // Trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${videoFile?.name?.replace(/\.[^/.]+$/, "") || 'talenthub'}_thumbnail.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeTextOverlayObj = textOverlays.find(t => t.id === selectedTextId);

  return (
    <div className="ve-page">
      {/* Hidden music element */}
      {selectedMusic && (
        <audio ref={musicAudioRef} src={selectedMusic.url} loop />
      )}

      {/* Editor Header */}
      <header className="ve-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="ve-back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="ve-header-title">Studio <span>Video Editor</span></h1>
        </div>
        {videoFile && (
          <button className="ve-export-btn" onClick={handleExportFrame}>
            📸 Export Thumbnail
          </button>
        )}
      </header>

      <div className="ve-body">
        {/* LEFT: Viewport & Timeline */}
        <div className="ve-left-col">
          {videoSrc ? (
            <div className="ve-workspace-area">
              {/* Aspect Ratio Viewport Container */}
              <div 
                ref={containerRef}
                className={`ve-viewport aspect-${aspectRatio.replace(':', '-')}`}
              >
                <video
                  ref={videoRef}
                  src={videoSrc}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onClick={togglePlay}
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`
                  }}
                />

                {/* Render Text Overlays on Top */}
                {textOverlays.map(item => (
                  <div
                    key={item.id}
                    className={`ve-text-overlay-item ${selectedTextId === item.id ? 'active' : ''}`}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      color: item.color,
                      fontSize: `${item.fontSize}px`,
                    }}
                    onPointerDown={(e) => handlePointerDown(e, item)}
                  >
                    {item.text}
                    {selectedTextId === item.id && (
                      <button
                        className="ve-text-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTextOverlay(item.id);
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Trimmer Timeline Widget */}
              <div className="ve-timeline-widget">
                <div className="ve-time-display">
                  <span>Current: {currentTime.toFixed(1)}s</span>
                  <span>Trim: {startTime.toFixed(1)}s - {endTime.toFixed(1)}s</span>
                  <span>Duration: {(endTime - startTime).toFixed(1)}s</span>
                </div>

                {/* Trimmer Multi-Range Track */}
                <div className="ve-trimmer-controls">
                  <div className="ve-trim-slider-wrap">
                    <label>Start: </label>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={startTime}
                      onChange={(e) => handleTrimChange('start', e.target.value)}
                    />
                  </div>
                  <div className="ve-trim-slider-wrap">
                    <label>End: </label>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={endTime}
                      onChange={(e) => handleTrimChange('end', e.target.value)}
                    />
                  </div>
                </div>

                {/* Main Playback Bar */}
                <div className="ve-play-row">
                  <button className="ve-play-btn" onClick={togglePlay}>
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <div className="ve-playback-progress">
                    <div 
                      className="ve-playback-fill" 
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Empty State */
            <div className="ve-empty-state" onClick={() => fileInputRef.current.click()}>
              <div className="ve-empty-icon">🎬</div>
              <h3>Select a video to edit</h3>
              <p>Drag and drop or click here to upload your performance (.mp4, .mov, .webm)</p>
              <button className="ve-upload-cta">Browse Video</button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* RIGHT: Controls Panels */}
        <div className="ve-right-col">
          {/* Controls Tabs */}
          <div className="ve-tab-buttons">
            <button 
              className={`ve-tab-btn ${activeTab === 'trim' ? 'active' : ''}`}
              onClick={() => setActiveTab('trim')}
            >
              📐 Fit & Trim
            </button>
            <button 
              className={`ve-tab-btn ${activeTab === 'filters' ? 'active' : ''}`}
              onClick={() => setActiveTab('filters')}
            >
              🎨 Filters
            </button>
            <button 
              className={`ve-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              ✍️ Overlays
            </button>
            <button 
              className={`ve-tab-btn ${activeTab === 'music' ? 'active' : ''}`}
              onClick={() => setActiveTab('music')}
            >
              🎵 Audio
            </button>
          </div>

          <div className="ve-tab-content">
            {/* TAB 1: Aspect Ratio & Trimmer */}
            {activeTab === 'trim' && (
              <div className="ve-trim-panel">
                <h3>Aspect Ratio Crop</h3>
                <p className="ve-panel-help">Choose a format for cropping the layout preview viewport.</p>
                <div className="ve-ratio-grid">
                  {['original', '9:16', '1:1', '16:9'].map(ratio => (
                    <button
                      key={ratio}
                      className={`ve-ratio-btn ${aspectRatio === ratio ? 'active' : ''}`}
                      onClick={() => setAspectRatio(ratio)}
                    >
                      {ratio === 'original' ? 'Original' : ratio === '9:16' ? '📱 9:16 Reels' : ratio === '1:1' ? '🟩 1:1 Square' : '🖥️ 16:9 YouTube'}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: '24px' }}>
                  <h3>Video Source info</h3>
                  <div className="ve-info-card">
                    <div>Filename: <span style={{ color: '#fff' }}>{videoFile?.name || 'N/A'}</span></div>
                    <div>Duration: <span style={{ color: '#fff' }}>{duration.toFixed(1)}s</span></div>
                    <div>File Size: <span style={{ color: '#fff' }}>{videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Visual Filters */}
            {activeTab === 'filters' && (
              <div className="ve-filters-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3>CSS Visual Filters</h3>
                  <button className="ve-reset-btn" onClick={resetFilters}>Reset</button>
                </div>

                <div className="ve-filter-control">
                  <div className="ve-filter-label">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                  />
                </div>

                <div className="ve-filter-control">
                  <div className="ve-filter-label">
                    <span>Contrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                  />
                </div>

                <div className="ve-filter-control">
                  <div className="ve-filter-label">
                    <span>Saturation</span>
                    <span>{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                  />
                </div>

                <div className="ve-filter-control">
                  <div className="ve-filter-label">
                    <span>Blur</span>
                    <span>{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={blur}
                    onChange={(e) => setBlur(parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Text Overlays */}
            {activeTab === 'text' && (
              <div className="ve-text-panel">
                <h3>Add Text Overlay</h3>
                <div className="ve-text-input-row">
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Enter overlay text..."
                    className="ve-text-input"
                  />
                  <button className="ve-add-text-btn" onClick={addTextOverlay}>
                    ➕ Add
                  </button>
                </div>

                {activeTextOverlayObj ? (
                  <div className="ve-text-editor-box" style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4>Edit Selected Text</h4>
                      <button 
                        className="ve-reset-btn" 
                        style={{ color: '#f43f5e' }}
                        onClick={() => removeTextOverlay(selectedTextId)}
                      >
                        Delete
                      </button>
                    </div>

                    <div className="ve-filter-control" style={{ marginTop: '12px' }}>
                      <div className="ve-filter-label">
                        <span>Text Content</span>
                      </div>
                      <input
                        type="text"
                        value={activeTextOverlayObj.text}
                        onChange={(e) => updateSelectedText('text', e.target.value)}
                        className="ve-text-input"
                      />
                    </div>

                    <div className="ve-filter-control">
                      <div className="ve-filter-label">
                        <span>Font Size</span>
                        <span>{activeTextOverlayObj.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="64"
                        value={activeTextOverlayObj.fontSize}
                        onChange={(e) => updateSelectedText('fontSize', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="ve-filter-control">
                      <div className="ve-filter-label">
                        <span>Color</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {['#ffffff', '#ffed4a', '#ff4d4d', '#4ade80', '#60a5fa', '#c084fc', '#f472b6'].map(color => (
                          <button
                            key={color}
                            onClick={() => updateSelectedText('color', color)}
                            style={{
                              backgroundColor: color,
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: activeTextOverlayObj.color === color ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={activeTextOverlayObj.color}
                          onChange={(e) => updateSelectedText('color', e.target.value)}
                          style={{
                            border: 'none',
                            background: 'none',
                            width: '26px',
                            height: '26px',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '16px', textAlign: 'center' }}>
                    Click on any text overlay on the video to customize its size, color, or content. Drag text directly to position it.
                  </p>
                )}

                {textOverlays.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h4>Text Layers list</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      {textOverlays.map(item => (
                        <div 
                          key={item.id} 
                          className={`ve-layer-item ${selectedTextId === item.id ? 'active' : ''}`}
                          onClick={() => setSelectedTextId(item.id)}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{item.text}"
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeTextOverlay(item.id); }}
                            style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}
                          >
                            🗑
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Background Music */}
            {activeTab === 'music' && (
              <div className="ve-music-panel">
                <h3>Background Music</h3>
                <p className="ve-panel-help">Search free royalty-free tracks via Pixabay API.</p>

                <div className="ve-pixabay-key-row">
                  <input
                    type="password"
                    placeholder="Pixabay API Key (Optional)..."
                    value={pixabayKey}
                    onChange={(e) => setPixabayKey(e.target.value)}
                    className="ve-text-input"
                    style={{ fontSize: '12px' }}
                  />
                </div>

                <div className="ve-text-input-row" style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search music e.g. lofi, electronic..."
                    value={musicSearch}
                    onChange={(e) => setMusicSearch(e.target.value)}
                    className="ve-text-input"
                  />
                  <button className="ve-add-text-btn" onClick={searchPixabayMusic}>
                    🔍 Find
                  </button>
                </div>

                {selectedMusic && (
                  <div className="ve-music-selected-card" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 600 }}>SELECTED AUDIO</div>
                        <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>{selectedMusic.name}</div>
                      </div>
                      <button 
                        onClick={() => setSelectedMusic(null)}
                        style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Volume:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: '#8B5CF6' }}
                      />
                      <button
                        onClick={() => setMusicMuted(!musicMuted)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '15px'
                        }}
                      >
                        {musicMuted ? '🔇' : '🔊'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="ve-tracks-list" style={{ marginTop: '20px' }}>
                  <h4>Available Music Tracks</h4>
                  {musicLoading ? (
                    <p style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>Searching tracks...</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      {musicTracks.map(track => (
                        <div 
                          key={track.id} 
                          className={`ve-track-row ${selectedMusic?.id === track.id ? 'active' : ''}`}
                          onClick={() => handleMusicSelect(track)}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {track.name}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                              {track.artist}
                            </span>
                          </div>
                          <span style={{ fontSize: '12px' }}>
                            {selectedMusic?.id === track.id ? '✅ Active' : '➕ Select'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
